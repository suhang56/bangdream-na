import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotoGrid from './PhotoGrid.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const mk = (overrides) => ({
  id: 1,
  imageUrl: 'https://cdn/x.jpg',
  caption: '说明',
  takenAt: 1700000000,
  eventId: null,
  eventSlug: null,
  eventTitleZh: null,
  album: 'a',
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('<PhotoGrid />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
  })
  afterEach(() => {
    _resetForTests()
  })

  it('renders nothing for empty items array', () => {
    const { container } = render(<PhotoGrid items={[]} onItemClick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for non-array items', () => {
    const { container } = render(<PhotoGrid items={null} onItemClick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders N thumb buttons from props', () => {
    const items = [mk({ id: 1 }), mk({ id: 2, caption: '' }), mk({ id: 3 })]
    render(<PhotoGrid items={items} onItemClick={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('clicking a thumb invokes onItemClick(index, item)', () => {
    const onItemClick = vi.fn()
    const items = [mk({ id: 11 }), mk({ id: 22 })]
    render(<PhotoGrid items={items} onItemClick={onItemClick} />)
    const btns = screen.getAllByRole('button')
    fireEvent.click(btns[1])
    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith(1, items[1])
  })

  it('thumb without caption omits the overlay span', () => {
    const items = [mk({ id: 1, caption: '' })]
    const { container } = render(<PhotoGrid items={items} onItemClick={() => {}} />)
    expect(container.querySelector('.gallery-thumb__overlay')).toBeNull()
  })

  it('uses fallback aria-label when no caption', () => {
    const items = [mk({ id: 1, caption: '' })]
    render(<PhotoGrid items={items} onItemClick={() => {}} />)
    expect(screen.getByRole('button', { name: /第 1 张照片/ })).toBeTruthy()
  })

  it('respects custom ariaLabel on the list', () => {
    const items = [mk({ id: 1 })]
    render(<PhotoGrid items={items} onItemClick={() => {}} ariaLabel="活动相册" />)
    expect(screen.getByRole('list', { name: '活动相册' })).toBeTruthy()
  })

  it('default ariaLabel comes from i18n in EN locale', () => {
    setLanguage('en')
    const items = [mk({ id: 1, caption: '' })]
    render(<PhotoGrid items={items} onItemClick={() => {}} />)
    expect(screen.getByRole('list', { name: 'Album photos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Photo 1' })).toBeTruthy()
  })

  it('photoFallbackLabel uses {n} placeholder for index+1', () => {
    setLanguage('zh')
    const items = [mk({ id: 1, caption: '' }), mk({ id: 2, caption: '' })]
    render(<PhotoGrid items={items} onItemClick={() => {}} />)
    expect(screen.getByRole('button', { name: '第 1 张照片' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '第 2 张照片' })).toBeTruthy()
  })
})
