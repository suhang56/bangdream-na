import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminAssetUploader from './AdminAssetUploader.jsx'
import * as githubApi from '../../lib/githubApi.js'

const FIELD = {
  key: 'image',
  label: 'Image',
  type: 'asset',
  uploadDir: 'public/events/',
}

function pngFile(name = 'pic.png', size = 1000) {
  const f = new File([new Uint8Array(size)], name, { type: 'image/png' })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('<AdminAssetUploader />', () => {
  let uploadSpy
  beforeEach(() => {
    uploadSpy = vi.spyOn(githubApi, 'uploadAsset').mockResolvedValue({ path: 'public/events/x.png', sha: 'sha' })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Edge 1: file >5MB rejected — no uploadAsset call, error visible', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="event-1" onChange={onChange} />)
    const big = pngFile('big.png', 6 * 1024 * 1024)
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [big] } })
    expect(uploadSpy).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/too large/i))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Edge 2: unsupported MIME (gif) rejected', async () => {
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="event-1" onChange={() => {}} />)
    const gif = new File(['x'], 'pic.gif', { type: 'image/gif' })
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [gif] } })
    expect(uploadSpy).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/unsupported/i))
  })

  it('Edge 3 (drag-drop PNG): calls uploadAsset and onChange with /events/<slug>.png', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="my-event" onChange={onChange} />)
    const file = pngFile('whatever.png', 1000)
    const dropzone = screen.getByRole('button', { name: /drag image|uploading/i })
    fireEvent.dragOver(dropzone, { dataTransfer: { files: [file] } })
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    const args = uploadSpy.mock.calls[0]
    expect(args[1]).toBe('public/events/my-event.png')
    expect(args[4]).toBe('content-updates')
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/events/my-event.png'))
  })

  it('Edge 4 (click-pick PNG): same flow', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="event-2" onChange={onChange} />)
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile('a.png')] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(onChange).toHaveBeenCalledWith('/events/event-2.png')
  })

  it('Edge 5: SVG accepted (default mime list includes svg+xml)', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="event-3" onChange={onChange} />)
    const svg = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })
    Object.defineProperty(svg, 'size', { value: 100 })
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [svg] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    const args = uploadSpy.mock.calls[0]
    expect(args[1]).toBe('public/events/event-3.svg')
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/events/event-3.svg'))
  })

  it('Edge 6: uploadAsset error → onError + no onChange', async () => {
    uploadSpy.mockRejectedValueOnce(new Error('GitHub server error (500).'))
    const onChange = vi.fn()
    const onError = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="event-4" onChange={onChange} onError={onError} />)
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringContaining('server error')))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Edge 7: filename with spaces + uppercase + special chars → slug normalized', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" onChange={onChange} />)
    const f = pngFile('My Cool Pic!.png')
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [f] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(uploadSpy.mock.calls[0][1]).toBe('public/events/my-cool-pic.png')
  })

  it('renders preview when value set', () => {
    render(<AdminAssetUploader field={FIELD} value="/events/x.png" token="ghp_X" onChange={() => {}} />)
    const img = screen.getByRole('img', { name: /image/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('/events/x.png'))
  })

  it('disables dropzone when no token', () => {
    render(<AdminAssetUploader field={FIELD} value="" token="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /drag image/i })).toBeDisabled()
  })

  it('jpeg extension normalized to jpg', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" slugBase="ev" onChange={onChange} />)
    const f = new File(['x'], 'a.jpeg', { type: 'image/jpeg' })
    Object.defineProperty(f, 'size', { value: 100 })
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [f] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(uploadSpy.mock.calls[0][1]).toBe('public/events/ev.jpg')
  })

  it('qrSuffix appends -qr to slug', async () => {
    const onChange = vi.fn()
    render(<AdminAssetUploader field={{ ...FIELD, uploadDir: 'public/social/' }} value="" token="ghp_X" slugBase="wechat" qrSuffix onChange={onChange} />)
    const hidden = document.querySelector('input[type=file]')
    fireEvent.change(hidden, { target: { files: [pngFile()] } })
    await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
    expect(uploadSpy.mock.calls[0][1]).toBe('public/social/wechat-qr.png')
  })

  it('drag-leave clears dragOver state', () => {
    render(<AdminAssetUploader field={FIELD} value="" token="ghp_X" onChange={() => {}} />)
    const dz = screen.getByRole('button', { name: /drag image/i })
    fireEvent.dragOver(dz)
    fireEvent.dragLeave(dz)
    expect(dz).not.toHaveClass('drag-over')
  })
})
