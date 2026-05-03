import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import PostCard from './PostCard.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const base = (overrides = {}) => ({
  id: 'p1',
  image: '/posts/p1.jpg',
  datePosted: '2025-04-30',
  ...overrides,
})

describe('<PostCard />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('returns null for missing post (edge)', () => {
    const { container } = renderWithProviders(<PostCard post={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders <img> with title as alt when title present', () => {
    renderWithProviders(<PostCard post={base({ title: 'Spring Meet' })} />)
    const img = screen.getByRole('img', { name: 'Spring Meet' })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/posts/p1.jpg')
  })

  it('renders <img> with empty alt when title missing', () => {
    const { container } = renderWithProviders(<PostCard post={base()} />)
    const img = container.querySelector('img.post-card__img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('alt')).toBe('')
  })

  it('renders title overlay only when title is non-empty trimmed string', () => {
    const { container, rerender } = renderWithProviders(
      <PostCard post={base({ title: 'Hello' })} />,
    )
    expect(container.querySelector('.post-card__overlay')).not.toBeNull()
    rerender(<PostCard post={base()} />)
    expect(container.querySelector('.post-card__overlay')).toBeNull()
  })

  it('does not render title overlay for whitespace-only title (edge)', () => {
    const { container } = renderWithProviders(
      <PostCard post={base({ title: '   ' })} />,
    )
    expect(container.querySelector('.post-card__overlay')).toBeNull()
  })

  it('renders letter-card fallback when image is missing', () => {
    const { container } = renderWithProviders(
      <PostCard post={{ id: 'p1', datePosted: '2025-04-30' }} />,
    )
    expect(container.querySelector('.post-card__letter')).not.toBeNull()
    expect(container.querySelector('img.post-card__img')).toBeNull()
  })

  it('renders letter-card with first character of title', () => {
    const { container } = renderWithProviders(
      <PostCard
        post={{ id: 'p1', datePosted: '2025-04-30', title: 'Spring Meet' }}
      />,
    )
    const letter = container.querySelector('.post-card__letter-char')
    expect(letter).not.toBeNull()
    expect(letter.textContent).toBe('S')
  })

  it('renders letter-card with first character of id when title absent', () => {
    const { container } = renderWithProviders(
      <PostCard post={{ id: 'meet-2025', datePosted: '2025-04-30' }} />,
    )
    // textContent reflects the raw character; CSS text-transform handles
    // visual uppercasing in the browser.
    expect(
      container.querySelector('.post-card__letter-char').textContent,
    ).toBe('m')
  })

  it('renders letter-card with ? when both title and id missing/empty (edge)', () => {
    const { container } = renderWithProviders(
      <PostCard post={{ datePosted: '2025-04-30' }} />,
    )
    expect(
      container.querySelector('.post-card__letter-char').textContent,
    ).toBe('?')
  })

  it('handles multi-byte CJK first-character correctly (edge)', () => {
    const { container } = renderWithProviders(
      <PostCard post={{ id: '春', datePosted: '2025-04-30', title: '春日活动' }} />,
    )
    expect(
      container.querySelector('.post-card__letter-char').textContent,
    ).toBe('春')
  })

  it('handles emoji first-character (surrogate-pair safe, edge)', () => {
    const { container } = renderWithProviders(
      <PostCard post={{ id: 'p1', datePosted: '2025-04-30', title: '🎉 Party' }} />,
    )
    expect(
      container.querySelector('.post-card__letter-char').textContent,
    ).toBe('🎉')
  })

  it('wraps in anchor with target=_blank when url is https', () => {
    renderWithProviders(
      <PostCard
        post={base({ title: 'Spring', url: 'https://example.com' })}
      />,
    )
    const link = screen.getByRole('link', { name: 'Spring' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('NOT wrapped in anchor when url is missing', () => {
    const { container } = renderWithProviders(<PostCard post={base()} />)
    expect(container.querySelector('a.post-card-link')).toBeNull()
  })

  it('NOT wrapped in anchor when url is http (non-https, edge)', () => {
    const { container } = renderWithProviders(
      <PostCard post={base({ url: 'http://example.com' })} />,
    )
    expect(container.querySelector('a.post-card-link')).toBeNull()
  })

  it('aria-label fallback uses btn.openPost when title missing', () => {
    renderWithProviders(
      <PostCard post={base({ url: 'https://x.com' })} position={3} />,
    )
    const link = screen.getByRole('link', { name: /open post 3/i })
    expect(link).toBeInTheDocument()
  })

  it('variant="side" sets aria-hidden and does NOT wrap in anchor (edge)', () => {
    const { container } = renderWithProviders(
      <PostCard
        post={base({ title: 'X', url: 'https://x.com' })}
        variant="side"
      />,
    )
    const article = container.querySelector('article.post-card')
    expect(article.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('a.post-card-link')).toBeNull()
  })

  it('image onError swaps to letter-card fallback (edge)', () => {
    const { container } = renderWithProviders(
      <PostCard post={base({ title: 'Title' })} />,
    )
    const img = container.querySelector('img.post-card__img')
    fireEvent.error(img)
    expect(container.querySelector('.post-card__letter')).not.toBeNull()
    expect(container.querySelector('img.post-card__img')).toBeNull()
  })

  it('switches aria-label to ZH when uiLanguage is zh (edge)', () => {
    setLanguage('zh')
    renderWithProviders(
      <PostCard post={base({ url: 'https://x.com' })} position={2} />,
    )
    const link = screen.getByRole('link', { name: /打开帖子 2/ })
    expect(link).toBeInTheDocument()
  })
})
