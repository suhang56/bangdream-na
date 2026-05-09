import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectionTitle from './SectionTitle.jsx'

function renderAt(props) {
  return render(
    <MemoryRouter>
      <SectionTitle {...props} />
    </MemoryRouter>,
  )
}

describe('<SectionTitle />', () => {
  it('renders cn + jp + more link', () => {
    const { container } = renderAt({ cn: '最新现地报告', jp: 'LATEST REPORTS', more: '全部新闻 →', href: '/news' })
    expect(container.querySelector('.bf-section-title')).toBeInTheDocument()
    expect(container.querySelector('.st-title')).toBeInTheDocument()
    expect(container.querySelector('.st-jp')).toBeInTheDocument()
    expect(container.querySelector('.st-more')).toBeInTheDocument()
    expect(container.textContent).toContain('最新现地报告')
    expect(container.textContent).toContain('LATEST REPORTS')
    expect(container.textContent).toContain('全部新闻')
    expect(container.querySelector('.st-more').getAttribute('href')).toBe('/news')
  })

  it('default more label is 查看全部 →', () => {
    const { container } = renderAt({ cn: 'X', jp: 'X' })
    expect(container.textContent).toContain('查看全部')
  })
})
