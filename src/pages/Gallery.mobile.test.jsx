import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

const groupOptions = [{ id: 'album-a', label: '相册甲', count: 1, kind: 'album' }]

describe('<GalleryMobile />', () => {
  it('renders hero + chip + dropdown + group section', () => {
    render(
      <GalleryMobile
        groups={groups}
        groupOptions={groupOptions}
        selectedGroupId={null}
        selectedOption={null}
        onSelectGroup={() => {}}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getByText('相册甲')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'All albums' })).toBeTruthy()
    expect(screen.getByLabelText('Filter by album')).toBeTruthy()
  })

  it('renders empty state when isEmpty=true', () => {
    render(
      <GalleryMobile
        groups={[]}
        groupOptions={[]}
        selectedGroupId={null}
        selectedOption={null}
        onSelectGroup={() => {}}
        totalImages={0}
        groupCount={0}
        onItemClick={() => {}}
        isEmpty
      />,
    )
    expect(screen.queryByRole('button', { name: 'All albums' })).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('clicking group header calls onSelectGroup with id', () => {
    const onSelectGroup = vi.fn()
    render(
      <GalleryMobile
        groups={groups}
        groupOptions={groupOptions}
        selectedGroupId={null}
        selectedOption={null}
        onSelectGroup={onSelectGroup}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    const headerBtn = screen.getByText('相册甲').closest('button')
    fireEvent.click(headerBtn)
    expect(onSelectGroup).toHaveBeenCalledWith('album-a')
  })

  it('renders active-filter pill + clear button when selectedOption set', () => {
    const onSelectGroup = vi.fn()
    render(
      <GalleryMobile
        groups={groups}
        groupOptions={groupOptions}
        selectedGroupId="album-a"
        selectedOption={{ id: 'album-a', label: '相册甲', count: 1, kind: 'album' }}
        onSelectGroup={onSelectGroup}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    expect(screen.getByText(/Filtered: 相册甲/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Clear filter'))
    expect(onSelectGroup).toHaveBeenCalledWith(null)
  })
})
