/**
 * Localized label + visual variant + a11y live-region intensity for the
 * save-status pill in the admin top bar.
 *
 * @param {{ status?: 'idle'|'saving'|'saved'|'error', prNumber?: number|null }} state
 * @returns {{ label: string, variant: 'idle'|'saving'|'saved'|'error', a11yLive: 'polite'|'off' }}
 */
export function deriveSaveStatusLabel(state) {
  const status = state?.status
  switch (status) {
    case 'saving':
      return { label: '保存中…', variant: 'saving', a11yLive: 'polite' }
    case 'saved': {
      const prNumber = state?.prNumber
      const label =
        typeof prNumber === 'number' && Number.isFinite(prNumber) && prNumber > 0
          ? `✓ 已保存 · PR #${prNumber}`
          : '✓ 已保存'
      return { label, variant: 'saved', a11yLive: 'polite' }
    }
    case 'error':
      return { label: '✗ 保存失败', variant: 'error', a11yLive: 'polite' }
    case 'idle':
    default:
      return { label: '已保存', variant: 'idle', a11yLive: 'off' }
  }
}
