import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MembersDesktop from './Members.desktop.jsx'

const FIXTURE_MEMBERS = [
  {
    id: '1',
    name: 'Kanade',
    role: 'organizer',
    oshiBand: 'roselia',
    oshiCharacter: 'Yukina',
    city: 'Seattle',
    bio: 'Vocalist for the Roselia cover band.',
  },
  {
    id: '2',
    name: 'Sora',
    role: 'member',
    oshiBand: 'mygo',
    city: 'Vancouver',
  },
]

const BASE_PROPS = {
  visibleMembers: FIXTURE_MEMBERS,
  availableBands: ['roselia', 'mygo'],
  selectedBands: [],
  onBandsChange: () => {},
  selectedRole: null,
  onRoleChange: () => {},
  searchInput: '',
  onSearchChange: () => {},
  emptyMessage: 'No members match your filters.',
}

describe('MembersDesktop', () => {
  it('renders the section heading', () => {
    render(<MembersDesktop {...BASE_PROPS} />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders MemberFilter with band chip buttons', () => {
    render(<MembersDesktop {...BASE_PROPS} />)
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
  })

  it('renders MemberGrid with one card per visible member', () => {
    const { container } = render(<MembersDesktop {...BASE_PROPS} />)
    expect(container.querySelectorAll('.member-card')).toHaveLength(2)
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.getByText('Sora')).toBeInTheDocument()
  })

  it('renders empty message when visibleMembers is empty', () => {
    render(
      <MembersDesktop
        {...BASE_PROPS}
        visibleMembers={[]}
        emptyMessage="No members match your filters."
      />,
    )
    expect(
      screen.getByText('No members match your filters.'),
    ).toBeInTheDocument()
  })

  it('search input typing fires onSearchChange', async () => {
    const onSearchChange = vi.fn()
    render(
      <MembersDesktop {...BASE_PROPS} onSearchChange={onSearchChange} />,
    )
    const input = screen.getByLabelText('Search')
    await userEvent.type(input, 'k')
    expect(onSearchChange).toHaveBeenCalledWith('k')
  })

  it('chip click fires onBandsChange', async () => {
    const onBandsChange = vi.fn()
    render(
      <MembersDesktop {...BASE_PROPS} onBandsChange={onBandsChange} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(onBandsChange).toHaveBeenCalledWith(['roselia'])
  })

  it('role radio change fires onRoleChange', () => {
    const onRoleChange = vi.fn()
    render(
      <MembersDesktop {...BASE_PROPS} onRoleChange={onRoleChange} />,
    )
    // The radio input is visually hidden + pointer-events:none for chip-style
    // labels; fireEvent on the input bypasses pointer-events guard like the
    // existing Members page tests in pages/Members.test.jsx do.
    fireEvent.click(screen.getByLabelText('Organizers'))
    expect(onRoleChange).toHaveBeenCalledWith('organizer')
  })

  it('searchInput value renders as the controlled input value', () => {
    render(<MembersDesktop {...BASE_PROPS} searchInput="kanade" />)
    expect(screen.getByLabelText('Search')).toHaveValue('kanade')
  })

  it('hides band fieldset when availableBands is empty (empty-legend fix)', () => {
    const { container } = render(
      <MembersDesktop {...BASE_PROPS} availableBands={[]} />,
    )
    expect(container.querySelector('.member-filter-bands')).toBeNull()
  })

  it('passes selectedBands through (active chip aria-pressed)', () => {
    render(
      <MembersDesktop {...BASE_PROPS} selectedBands={['roselia']} />,
    )
    expect(screen.getByRole('button', { name: 'Roselia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('renders within <main> landmark', () => {
    const { container } = render(<MembersDesktop {...BASE_PROPS} />)
    expect(container.querySelector('main.section')).not.toBeNull()
  })

  it('grid contains member cards inside a list', () => {
    const { container } = render(<MembersDesktop {...BASE_PROPS} />)
    const grid = container.querySelector('ul.member-grid')
    expect(grid).not.toBeNull()
    expect(within(grid).getAllByRole('listitem')).toHaveLength(2)
  })
})
