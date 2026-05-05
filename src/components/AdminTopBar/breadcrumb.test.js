import { describe, it, expect } from 'vitest'
import { deriveBreadcrumb } from './breadcrumb.js'

describe('deriveBreadcrumb', () => {
  it('list view: 后台 / 活动', () => {
    expect(deriveBreadcrumb('events', null)).toEqual([
      { label: '后台' },
      { label: '活动' },
    ])
  })

  it('edit view with title: 后台 / 活动 / <title>', () => {
    expect(deriveBreadcrumb('events', { id: 'a', title: '春日演唱会' })).toEqual([
      { label: '后台' },
      { label: '活动' },
      { label: '春日演唱会' },
    ])
  })

  it('new-item view: 后台 / 活动 / 新建活动', () => {
    expect(deriveBreadcrumb('events', { __new: true })).toEqual([
      { label: '后台' },
      { label: '活动' },
      { label: '新建活动' },
    ])
  })

  it('edit view falls back to name when no title (members)', () => {
    expect(deriveBreadcrumb('members', { id: 'm1', name: '西瓜' })).toEqual([
      { label: '后台' },
      { label: '成员' },
      { label: '西瓜' },
    ])
  })

  it('edit view falls back to listKey value when no title/name', () => {
    expect(deriveBreadcrumb('events', { id: 'evt-x' })).toEqual([
      { label: '后台' },
      { label: '活动' },
      { label: 'evt-x' },
    ])
  })

  it('edit view falls back to "编辑" when no usable label', () => {
    expect(deriveBreadcrumb('events', {})).toEqual([
      { label: '后台' },
      { label: '活动' },
      { label: '编辑' },
    ])
  })

  it('legacy singleton key "site" no longer resolves (returns just root)', () => {
    // After PR-D dead-code purge: site settings live in the __site_settings__
    // tab outside any schema registry, so "site" is not a known schema key.
    expect(deriveBreadcrumb('site', null)).toEqual([{ label: '后台' }])
    expect(deriveBreadcrumb('site', { discordInvite: 'x' })).toEqual([
      { label: '后台' },
    ])
  })

  it('legacy singleton key "about" no longer resolves (use aboutSections)', () => {
    // After PR-D: only `aboutSections` (array-shape D1 schema) is valid.
    expect(deriveBreadcrumb('about', { mission: 'm' })).toEqual([{ label: '后台' }])
    expect(deriveBreadcrumb('aboutSections', null)).toEqual([
      { label: '后台' },
      { label: '关于页章节' },
    ])
  })

  it('unknown schema returns just root', () => {
    expect(deriveBreadcrumb('not-a-schema', null)).toEqual([{ label: '后台' }])
    expect(deriveBreadcrumb('not-a-schema', { __new: true })).toEqual([{ label: '后台' }])
  })

  it('non-string schemaKey returns just root', () => {
    expect(deriveBreadcrumb(null, null)).toEqual([{ label: '后台' }])
    expect(deriveBreadcrumb(undefined, null)).toEqual([{ label: '后台' }])
    expect(deriveBreadcrumb(42, null)).toEqual([{ label: '后台' }])
  })

  it('edit view with empty-string title falls through to name/listKey/fallback', () => {
    expect(deriveBreadcrumb('events', { id: 'evt-y', title: '' })).toEqual([
      { label: '后台' },
      { label: '活动' },
      { label: 'evt-y' },
    ])
  })

  it('edit view with __new=false (truthy editing) treats as edit', () => {
    expect(deriveBreadcrumb('events', { __new: false, id: 'a', title: 'X' })).toEqual([
      { label: '后台' },
      { label: '活动' },
      { label: 'X' },
    ])
  })
})
