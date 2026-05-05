import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('yet-another-react-lightbox/styles.css', () => ({}))
vi.mock('yet-another-react-lightbox/plugins/captions.css', () => ({}))

const lightboxSpy = vi.fn()

vi.mock('yet-another-react-lightbox', () => ({
  default: (props) => {
    lightboxSpy(props)
    if (!props.open) return null
    const slide = props.slides?.[props.index ?? 0]
    return (
      <div data-testid="yarl">
        <button type="button" onClick={() => props.close?.()}>close</button>
        <img src={slide?.src} alt="" />
        <div data-testid="yarl-title">{slide?.title}</div>
        <div data-testid="yarl-desc">{slide?.description}</div>
      </div>
    )
  },
}))

vi.mock('yet-another-react-lightbox/plugins/captions', () => ({
  default: function Captions() { return null },
}))

import Lightbox from './Lightbox.jsx'

const mk = (overrides) => ({
  id: 1,
  imageUrl: 'https://cdn/x.jpg',
  caption: '我的照片',
  takenAt: 1700000000,
  eventId: 1,
  eventSlug: 'meet',
  eventTitleZh: '聚会',
  album: null,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('<Lightbox />', () => {
  it('returns null when open=false', () => {
    const { queryByTestId } = render(
      <Lightbox items={[mk()]} open={false} index={0} onClose={() => {}} />,
    )
    expect(queryByTestId('yarl')).toBeNull()
  })

  it('renders the image src for the current index when open', () => {
    const items = [mk({ id: 1, imageUrl: 'a.jpg' }), mk({ id: 2, imageUrl: 'b.jpg' })]
    const { container } = render(
      <Lightbox items={items} open index={1} onClose={() => {}} />,
    )
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe('b.jpg')
  })

  it('clicking close invokes onClose', () => {
    const onClose = vi.fn()
    const { getByText } = render(
      <Lightbox items={[mk()]} open index={0} onClose={onClose} />,
    )
    getByText('close').click()
    expect(onClose).toHaveBeenCalled()
  })

  it('description joins date + group label with " · "', () => {
    const items = [
      mk({ takenAt: 1700000000, eventTitleZh: '聚会', album: null }),
    ]
    const { getByTestId } = render(
      <Lightbox items={items} open index={0} onClose={() => {}} />,
    )
    expect(getByTestId('yarl-desc').textContent).toMatch(/2023-11-14.*聚会/)
  })

  it('description omits date when takenAt is null', () => {
    const items = [mk({ takenAt: null, eventTitleZh: '聚会', album: null })]
    const { getByTestId } = render(
      <Lightbox items={items} open index={0} onClose={() => {}} />,
    )
    expect(getByTestId('yarl-desc').textContent).toBe('聚会')
  })

  it('handles non-array items by passing empty slides', () => {
    render(<Lightbox items={null} open index={0} onClose={() => {}} />)
    const lastCall = lightboxSpy.mock.calls.at(-1)?.[0]
    expect(lastCall.slides).toEqual([])
  })
})
