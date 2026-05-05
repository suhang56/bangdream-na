import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

const groupOptions = [{ id: 'event-a', label: '甲活动', count: 1, kind: 'event' }]

describe('<GalleryDesktop />', () => {
  it('renders title + 全部 chip + dropdown', () => {
    render(
      <GalleryDesktop
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
    expect(screen.getByRole('button', { name: 'All albums' })).toBeTruthy()
    expect(screen.getByLabelText('Filter by album')).toBeTruthy()
  })

  it('renders empty state (no chip/dropdown) when isEmpty=true', () => {
    render(
      <GalleryDesktop
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

  it('marks the 全部 chip active when no filter is set', () => {
    render(
      <GalleryDesktop
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
    const chip = screen.getByRole('button', { name: 'All albums' })
    expect(chip.classList.contains('gallery-chip--active')).toBe(true)
  })

  it('renders active-filter pill when selectedOption is set', () => {
    render(
      <GalleryDesktop
        groups={groups}
        groupOptions={groupOptions}
        selectedGroupId="event-a"
        selectedOption={{ id: 'event-a', label: '甲活动', count: 1, kind: 'event' }}
        onSelectGroup={() => {}}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    expect(screen.getByText(/Filtered: 甲活动/)).toBeTruthy()
    expect(screen.getByLabelText('Clear filter')).toBeTruthy()
  })

  it('clicking the clear button calls onSelectGroup(null)', () => {
    const onSelectGroup = vi.fn()
    render(
      <GalleryDesktop
        groups={groups}
        groupOptions={groupOptions}
        selectedGroupId="event-a"
        selectedOption={{ id: 'event-a', label: '甲活动', count: 1, kind: 'event' }}
        onSelectGroup={onSelectGroup}
        totalImages={1}
        groupCount={1}
        onItemClick={() => {}}
        isEmpty={false}
      />,
    )
    fireEvent.click(screen.getByLabelText('Clear filter'))
    expect(onSelectGroup).toHaveBeenCalledWith(null)
  })

  it('selecting a dropdown option calls onSelectGroup with the id', () => {
    const onSelectGroup = vi.fn()
    render(
      <GalleryDesktop
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
    fireEvent.change(screen.getByLabelText('Filter by album'), {
      target: { value: 'event-a' },
    })
    expect(onSelectGroup).toHaveBeenCalledWith('event-a')
  })

  it('clicking a group header button calls onSelectGroup(group.id)', () => {
    const onSelectGroup = vi.fn()
    render(
      <GalleryDesktop
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
    const headerBtn = screen.getByText('甲活动').closest('button')
    fireEvent.click(headerBtn)
    expect(onSelectGroup).toHaveBeenCalledWith('event-a')
  })
})
