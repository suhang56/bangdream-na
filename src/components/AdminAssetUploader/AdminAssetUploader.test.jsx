import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminAssetUploader from './AdminAssetUploader.jsx'
import * as uploadModule from '../../lib/admin/uploadImage.js'

const FIELD = {
  key: 'hero_image_url',
  label: '主图',
  uploadKind: 'events',
}

function pngFile(name = 'pic.png', size = 1024) {
  const f = new File([new Uint8Array(size)], name, { type: 'image/png' })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('<AdminAssetUploader />', () => {
  let uploadSpy
  beforeEach(() => {
    uploadSpy = vi.spyOn(uploadModule, 'uploadImageWithGuard').mockResolvedValue({
      url: 'https://cdn.bangdream.org/events/x-123.png',
      key: 'events/x-123.png',
      size: 1024,
      contentType: 'image/png',
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders dropzone in idle state', () => {
    render(<AdminAssetUploader field={FIELD} value="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /拖拽图片/ })).toBeInTheDocument()
  })

  it('renders preview when value is set', () => {
    render(
      <AdminAssetUploader
        field={FIELD}
        value="https://cdn.bangdream.org/events/x.png"
        onChange={() => {}}
      />,
    )
    const img = screen.getByRole('img', { name: /主图/i })
    expect(img).toHaveAttribute('src', 'https://cdn.bangdream.org/events/x.png')
  })

  it('drag-drop PNG calls uploadImageWithGuard with kind + slug', async () => {
    const onChange = vi.fn()
    render(
      <AdminAssetUploader
        field={FIELD}
        value=""
        slugBase="My Event"
        onChange={onChange}
      />,
    )
    const dz = screen.getByRole('button', { name: /拖拽图片/ })
    const file = pngFile('whatever.png')
    fireEvent.dragOver(dz, { dataTransfer: { files: [file] } })
    fireEvent.drop(dz, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    const args = uploadSpy.mock.calls[0]
    expect(args[1]).toBe('events')
    expect(args[2]).toEqual({ slug: 'my-event' })
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('https://cdn.bangdream.org/events/x-123.png'),
    )
  })

  it('click-pick PNG triggers same flow', async () => {
    const onChange = vi.fn()
    render(
      <AdminAssetUploader field={FIELD} value="" slugBase="ev" onChange={onChange} />,
    )
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(onChange).toHaveBeenCalledWith('https://cdn.bangdream.org/events/x-123.png')
  })

  it('upload error displays message', async () => {
    uploadSpy.mockRejectedValueOnce(Object.assign(new Error('文件过大'), { code: 'too_large' }))
    const onChange = vi.fn()
    render(
      <AdminAssetUploader field={FIELD} value="" onChange={onChange} />,
    )
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/文件过大/))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('401 unauthorized → onAuthExpired called', async () => {
    uploadSpy.mockRejectedValueOnce(Object.assign(new Error('登录已过期'), { code: 'unauthorized' }))
    const onChange = vi.fn()
    const onAuthExpired = vi.fn()
    render(
      <AdminAssetUploader
        field={FIELD}
        value=""
        onChange={onChange}
        onAuthExpired={onAuthExpired}
      />,
    )
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('403 forbidden → onForbidden called', async () => {
    uploadSpy.mockRejectedValueOnce(Object.assign(new Error('需要管理员权限'), { code: 'forbidden' }))
    const onForbidden = vi.fn()
    render(
      <AdminAssetUploader
        field={FIELD}
        value=""
        onChange={() => {}}
        onForbidden={onForbidden}
      />,
    )
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(onForbidden).toHaveBeenCalled())
  })

  it('drop with no files is a no-op', () => {
    render(
      <AdminAssetUploader field={FIELD} value="" onChange={() => {}} />,
    )
    const dz = screen.getByRole('button', { name: /拖拽图片/ })
    fireEvent.drop(dz, { dataTransfer: { files: [] } })
    expect(uploadSpy).not.toHaveBeenCalled()
  })

  it('drag-leave clears dragOver state', () => {
    render(
      <AdminAssetUploader field={FIELD} value="" onChange={() => {}} />,
    )
    const dz = screen.getByRole('button', { name: /拖拽图片/ })
    fireEvent.dragOver(dz)
    fireEvent.dragLeave(dz)
    expect(dz).not.toHaveClass('drag-over')
  })

  it('uses field.uploadKind to select the upload bucket prefix', async () => {
    const onChange = vi.fn()
    render(
      <AdminAssetUploader
        field={{ ...FIELD, uploadKind: 'members' }}
        value=""
        slugBase="member-1"
        onChange={onChange}
      />,
    )
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(uploadSpy.mock.calls[0][1]).toBe('members')
  })

  it('without slugBase, slug option is omitted', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" onChange={onChange} />)
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(uploadSpy.mock.calls[0][2]).toEqual({})
  })
})
