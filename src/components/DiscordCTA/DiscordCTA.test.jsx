import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import DiscordCTA from './DiscordCTA.jsx'
import { isValidDiscordUrl } from './validateDiscordUrl.js'

describe('isValidDiscordUrl', () => {
  it('accepts canonical https://discord.gg/ URL', () => {
    expect(isValidDiscordUrl('https://discord.gg/abc123')).toBe(true)
  })

  it('accepts https://discord.com/invite/ URL', () => {
    expect(isValidDiscordUrl('https://discord.com/invite/abc123')).toBe(true)
  })

  it('trims whitespace before validation', () => {
    expect(isValidDiscordUrl('   https://discord.gg/abc  ')).toBe(true)
  })

  it('rejects http:// (no s)', () => {
    expect(isValidDiscordUrl('http://discord.gg/abc')).toBe(false)
  })

  it('rejects unrelated domain', () => {
    expect(isValidDiscordUrl('https://example.com/discord.gg')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidDiscordUrl('')).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(isValidDiscordUrl('   ')).toBe(false)
  })

  it('rejects non-string input (null, undefined, number)', () => {
    expect(isValidDiscordUrl(null)).toBe(false)
    expect(isValidDiscordUrl(undefined)).toBe(false)
    expect(isValidDiscordUrl(12345)).toBe(false)
    expect(isValidDiscordUrl({})).toBe(false)
  })

  it('rejects junk that contains discord but does not start with prefix', () => {
    expect(isValidDiscordUrl('javascript:https://discord.gg/x')).toBe(false)
  })
})

describe('<DiscordCTA />', () => {
  it('renders active anchor with valid URL', () => {
    renderWithProviders(<DiscordCTA url="https://discord.gg/abc" />)
    const link = screen.getByRole('link', { name: /join discord/i })
    expect(link).toHaveAttribute('href', 'https://discord.gg/abc')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('trims whitespace in href when URL is valid', () => {
    renderWithProviders(<DiscordCTA url="  https://discord.gg/abc  " />)
    const link = screen.getByRole('link', { name: /join discord/i })
    expect(link).toHaveAttribute('href', 'https://discord.gg/abc')
  })

  it('renders disabled button with empty URL (edge)', () => {
    renderWithProviders(<DiscordCTA url="" />)
    const btn = screen.getByRole('button', { name: /discord coming soon/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    expect(btn).toHaveAttribute('title', 'Discord coming soon')
  })

  it('renders disabled state when URL is undefined (edge)', () => {
    renderWithProviders(<DiscordCTA />)
    expect(screen.getByRole('button', { name: /discord coming soon/i })).toBeDisabled()
  })

  it('renders disabled state when URL has wrong prefix (edge: invalid)', () => {
    renderWithProviders(<DiscordCTA url="https://example.com/" />)
    expect(screen.getByRole('button', { name: /discord coming soon/i })).toBeDisabled()
  })

  it('renders disabled state for whitespace-only URL (edge)', () => {
    renderWithProviders(<DiscordCTA url="     " />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies lg size class when size="lg"', () => {
    renderWithProviders(<DiscordCTA url="https://discord.gg/abc" size="lg" />)
    const link = screen.getByRole('link', { name: /join discord/i })
    expect(link.className).toMatch(/discord-cta--lg/)
  })

  it('defaults to md size when size prop omitted', () => {
    renderWithProviders(<DiscordCTA url="https://discord.gg/abc" />)
    const link = screen.getByRole('link', { name: /join discord/i })
    expect(link.className).toMatch(/discord-cta--md/)
  })
})
