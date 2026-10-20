import type { StageProbeSnapshot } from './StageProbe.types'

/**
 * Test hook: exposes one read-only snapshot of the live stage to the browser.
 *
 * It exists so the M0 acceptance run can prove the gray-box stage was actually
 * completed in a real browser instead of trusting a screenshot. It never writes
 * to the rule layer, so the presentation layer keeps its one-way contract.
 */
declare global {
  interface Window {
    __contraStage?: (() => StageProbeSnapshot | null) | undefined
  }
}

export function publishStageProbe(read: (() => StageProbeSnapshot) | null): void {
  if (typeof window === 'undefined') return
  if (read === null) {
    window.__contraStage = undefined
    return
  }
  window.__contraStage = read
}
