import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GalleryDesktop from './Gallery.desktop.jsx'

const groups = [
  {
    id: 'event-a',
    label: '甲活动',
    kind: 'event',
    eventSlug: 'a',
    items: [
      {
        id: 1,
        imageUrl: 'https://cdn/1.jpg',
        caption: '',
        takenAt: 1700000000,
        eventId: 1,
        eventSlug: 'a',
        eventTitleZh: '甲活动',
        album: null,
        sortOrder: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    dateRange: '2023-11-14',
  },
]

describe('<GalleryDesktop />', () => {
  it('renders title + subtitle + filter row', () => {
    render(
      <GalleryDesktop
        groups={groups}
        filter="all"
        onFilterChange={() => {}}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2)
  })

  it('renders empty state when isEmpty=true', () => {
    render(
      <GalleryDesktop
        groups={[]}
        filter="all"
        onFilterChange={() => {}}
        totalImages={0}
        groupCount={0}
        onItemClick={() => {}}
        isEmpty
      />,
    )
    expect(screen.queryByRole('button', { name: 'All' })).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('marks the active filter chip', () => {
    render(
      <GalleryDesktop
        groups={groups}
        filter="event"
        onFilterChange={() => {}}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    const activeBtn = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('gallery-chip--active'))
    expect(activeBtn?.textContent).toBe('Event Photos')
  })

  it('passes group through to PhotoGrid onItemClick', () => {
    const onItemClick = vi.fn()
    render(
      <GalleryDesktop
        groups={groups}
        filter="all"
        onFilterChange={() => {}}
        totalImages={1}
        groupCount={1}
        onItemClick={onItemClick}
        isEmpty={false}
      />,
    )
    const thumbBtn = screen.getByRole('button', { name: /第 1 张照片/ })
    thumbBtn.click()
    expect(onItemClick).toHaveBeenCalled()
    expect(onItemClick.mock.calls[0][2]).toBe(groups[0])
  })
})
