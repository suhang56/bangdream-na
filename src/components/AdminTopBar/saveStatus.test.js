import { describe, it, expect } from 'vitest'
import { deriveSaveStatusLabel } from './saveStatus.js'

describe('deriveSaveStatusLabel', () => {
  it('idle: label="已保存", variant="idle", a11yLive="off"', () => {
    expect(deriveSaveStatusLabel({ status: 'idle' })).toEqual({
      label: '已保存',
      variant: 'idle',
      a11yLive: 'off',
    })
  })

  it('saving: label="保存中…", variant="saving", polite', () => {
    expect(deriveSaveStatusLabel({ status: 'saving' })).toEqual({
      label: '保存中…',
      variant: 'saving',
      a11yLive: 'polite',
    })
  })

  it('saved with prNumber: includes PR #N', () => {
    expect(deriveSaveStatusLabel({ status: 'saved', prNumber: 42 })).toEqual({
      label: '✓ 已保存 · PR #42',
      variant: 'saved',
      a11yLive: 'polite',
    })
  })

  it('saved without prNumber: defensive fallback', () => {
    expect(deriveSaveStatusLabel({ status: 'saved' })).toEqual({
      label: '✓ 已保存',
      variant: 'saved',
      a11yLive: 'polite',
    })
  })

  it('saved with prNumber=0 / negative is treated as missing', () => {
    expect(deriveSaveStatusLabel({ status: 'saved', prNumber: 0 }).label).toBe('✓ 已保存')
    expect(deriveSaveStatusLabel({ status: 'saved', prNumber: -3 }).label).toBe('✓ 已保存')
  })

  it('saved with non-number prNumber is treated as missing', () => {
    expect(deriveSaveStatusLabel({ status: 'saved', prNumber: '42' }).label).toBe('✓ 已保存')
    expect(deriveSaveStatusLabel({ status: 'saved', prNumber: null }).label).toBe('✓ 已保存')
    expect(deriveSaveStatusLabel({ status: 'saved', prNumber: NaN }).label).toBe('✓ 已保存')
  })

  it('error: label="✗ 保存失败", variant="error", polite', () => {
    expect(deriveSaveStatusLabel({ status: 'error' })).toEqual({
      label: '✗ 保存失败',
      variant: 'error',
      a11yLive: 'polite',
    })
  })

  it('unknown status falls back to idle defaults', () => {
    expect(deriveSaveStatusLabel({ status: 'mystery' })).toEqual({
      label: '已保存',
      variant: 'idle',
      a11yLive: 'off',
    })
  })

  it('null/undefined state falls back to idle defaults', () => {
    expect(deriveSaveStatusLabel(null)).toEqual({
      label: '已保存',
      variant: 'idle',
      a11yLive: 'off',
    })
    expect(deriveSaveStatusLabel(undefined)).toEqual({
      label: '已保存',
      variant: 'idle',
      a11yLive: 'off',
    })
    expect(deriveSaveStatusLabel({})).toEqual({
      label: '已保存',
      variant: 'idle',
      a11yLive: 'off',
    })
  })
})
