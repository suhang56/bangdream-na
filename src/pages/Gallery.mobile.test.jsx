import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import GalleryMobile from './Gallery.mobile.jsx'

const groups = [
  {
    id: 'album-a',
    label: '相册甲',
    kind: 'album',
    eventSlug: null,
    items: [
      {
        id: 1,
        imageUrl: 'https://cdn/1.jpg',
        caption: '',
        takenAt: 1700000000,
        eventId: null,
        eventSlug: null,
        eventTitleZh: null,
        album: '相册甲',
        sortOrder: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    dateRange: '2023-11-14',
  },
]

describe('<GalleryMobile />', () => {
  it('renders hero + filter strip + group section', () => {
    render(
      <GalleryMobile
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
    expect(screen.getByText('相册甲')).toBeTruthy()
  })

  it('renders empty state when isEmpty=true', () => {
    render(
      <GalleryMobile
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

  it('mobile filter strip has the overflow-x scrollable class', () => {
    const { container } = render(
      <GalleryMobile
        groups={groups}
        filter="all"
        onFilterChange={() => {}}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    expect(container.querySelector('.gallery-page-mobile__filters')).toBeTruthy()
  })
})
