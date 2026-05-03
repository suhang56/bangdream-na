import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MembersMobile from './Members.mobile.jsx'

const FIXTURE_MEMBERS = [
  {
    id: '1',
    name: 'Kanade',
    role: 'organizer',
    oshiBand: 'roselia',
    oshiCharacter: 'Yukina',
    city: 'Seattle',
  },
  {
    id: '2',
    name: 'Sora',
    role: 'member',
    oshiBand: 'mygo',
    oshiCharacter: 'Tomori',
    city: 'Vancouver',
  },
]

const BASE_PROPS = {
  totalMembers: FIXTURE_MEMBERS.length,
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

describe('MembersMobile', () => {
  it('renders the hero h1 + subtitle', () => {
    render(<MembersMobile {...BASE_PROPS} />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders one card per visible member', () => {
    const { container } = render(<MembersMobile {...BASE_PROPS} />)
    expect(container.querySelectorAll('.members-mobile-card')).toHaveLength(2)
    expect(screen.getByText('Kanade')).toBeInTheDocument()
    expect(screen.getByText('Sora')).toBeInTheDocument()
  })

  it('renders meta row with city · oshi character separator', () => {
    render(<MembersMobile {...BASE_PROPS} />)
    expect(screen.getByText('Seattle · Yukina')).toBeInTheDocument()
    expect(screen.getByText('Vancouver · Tomori')).toBeInTheDocument()
  })

  it('omits meta row when both city and oshiCharacter are missing', () => {
    const member = {
      id: '99',
      name: 'Anon',
      role: 'member',
    }
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    expect(container.querySelector('.members-mobile-card-meta')).toBeNull()
  })

  it('renders only city when oshiCharacter missing', () => {
    const member = {
      id: '99',
      name: 'Anon',
      role: 'member',
      city: 'Portland',
    }
    render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    expect(screen.getByText('Portland')).toBeInTheDocument()
  })

  it('renders only oshiCharacter when city missing', () => {
    const member = {
      id: '99',
      name: 'Anon',
      role: 'member',
      oshiCharacter: 'Sayo',
    }
    render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    expect(screen.getByText('Sayo')).toBeInTheDocument()
  })

  it('renders monogram from first grapheme of name', () => {
    const { container } = render(<MembersMobile {...BASE_PROPS} />)
    const avatars = container.querySelectorAll('.members-mobile-card-avatar')
    expect(avatars[0].textContent).toBe('K')
    expect(avatars[1].textContent).toBe('S')
  })

  it('renders fallback "?" monogram when name is empty string', () => {
    const member = { id: '99', name: '', role: 'member' }
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    expect(
      container.querySelector('.members-mobile-card-avatar').textContent,
    ).toBe('?')
  })

  it('handles emoji/CJK names correctly via grapheme iterator', () => {
    const member = { id: '1', name: '柚妹', role: 'member' }
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    const avatar = container.querySelector('.members-mobile-card-avatar')
    expect(avatar.textContent).toBe('柚')
  })

  it('renders count pill with shown / total format', () => {
    const { container } = render(<MembersMobile {...BASE_PROPS} />)
    const pill = container.querySelector('.members-mobile-count')
    expect(pill).not.toBeNull()
    expect(pill.textContent).toMatch(/2 \/ 2/)
    expect(pill).toHaveAttribute('role', 'status')
    expect(pill).toHaveAttribute('aria-live', 'polite')
  })

  it('count pill reflects filter result < total', () => {
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[FIXTURE_MEMBERS[0]]}
        totalMembers={2}
      />,
    )
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /1 \/ 2/,
    )
  })

  it('renders empty state message when no visible members', () => {
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[]}
        totalMembers={2}
        emptyMessage="No members match your filters."
      />,
    )
    expect(
      screen.getByText('No members match your filters.'),
    ).toBeInTheDocument()
    expect(container.querySelector('.members-mobile-grid')).toBeNull()
    // Count pill still renders, shows 0 / 2
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /0 \/ 2/,
    )
  })

  it('passes availableBands through to MemberFilter (band fieldset visible)', () => {
    render(<MembersMobile {...BASE_PROPS} />)
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
  })

  it('hides band fieldset when availableBands is empty (empty-legend bug fix)', () => {
    const { container } = render(
      <MembersMobile {...BASE_PROPS} availableBands={[]} />,
    )
    expect(container.querySelector('.member-filter-bands')).toBeNull()
    expect(screen.queryByText(/Filter by band/i)).not.toBeInTheDocument()
  })

  it('long names are clamped to 1 line via title fallback', () => {
    const longName = 'A'.repeat(80)
    const member = { id: '1', name: longName, role: 'member' }
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    const nameEl = container.querySelector('.members-mobile-card-name')
    expect(nameEl).toHaveAttribute('title', longName)
  })

  it('alumnus member gets visual modifier class', () => {
    const member = { id: '1', name: 'Old', role: 'alumnus' }
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    const card = container.querySelector('.members-mobile-card')
    expect(card.className).toContain('members-mobile-card--alumnus')
  })

  it('alumnus flag (alumnus: true) also yields modifier even when role !== alumnus', () => {
    const member = { id: '1', name: 'Old', role: 'member', alumnus: true }
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[member]}
        totalMembers={1}
      />,
    )
    expect(
      container.querySelector('.members-mobile-card--alumnus'),
    ).not.toBeNull()
  })

  it('search input typing fires onSearchChange', async () => {
    const onSearchChange = vi.fn()
    render(
      <MembersMobile {...BASE_PROPS} onSearchChange={onSearchChange} />,
    )
    const input = screen.getByLabelText('Search')
    await userEvent.type(input, 'a')
    expect(onSearchChange).toHaveBeenCalledWith('a')
  })

  it('chip click fires onBandsChange', async () => {
    const onBandsChange = vi.fn()
    render(
      <MembersMobile {...BASE_PROPS} onBandsChange={onBandsChange} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(onBandsChange).toHaveBeenCalledWith(['roselia'])
  })

  it('renders sticky filter strip element', () => {
    const { container } = render(<MembersMobile {...BASE_PROPS} />)
    const strip = container.querySelector('.members-mobile-filter')
    expect(strip).not.toBeNull()
    expect(strip.tagName.toLowerCase()).toBe('section')
  })

  it('grid uses ul/li semantics', () => {
    const { container } = render(<MembersMobile {...BASE_PROPS} />)
    const grid = container.querySelector('ul.members-mobile-grid')
    expect(grid).not.toBeNull()
    expect(within(grid).getAllByRole('listitem')).toHaveLength(2)
  })

  it('handles totalMembers=0 (empty roster) gracefully', () => {
    const { container } = render(
      <MembersMobile
        {...BASE_PROPS}
        visibleMembers={[]}
        totalMembers={0}
        emptyMessage="Members coming soon."
      />,
    )
    expect(screen.getByText('Members coming soon.')).toBeInTheDocument()
    expect(container.querySelector('.members-mobile-count').textContent).toMatch(
      /0 \/ 0/,
    )
  })
})
