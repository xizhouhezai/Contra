/** What the acceptance probe may read from the running stage. */
export interface StageProbeSnapshot {
  readonly scene: string
  readonly steps: number
  readonly cleared: boolean
  readonly score: number
  readonly playerX: number
  readonly stageClearedEvents: number
  readonly fps: number
  /**
   * Act I expansion state (REQ-STG-009 / REQ-STG-010).
   *
   * Optional and additive, so a probe from an older build still type-checks and
   * a stage with no waves simply reports zero. These are the fields the act I
   * acceptance run needs to prove that a stage really is built out of beats rather
   * than a screenshot of one: how many waves fired, whether the door is open, and
   * which mid-stage fight (if any) is running.
   */
  readonly wavesFired: number
  readonly wavesCleared: number
  readonly routeOpen: boolean
  readonly minibossRouteOpen: boolean
  readonly minibossId: string | null
  readonly minibossPhase: number
  readonly minibossHp: number
  readonly liveTargets: number
}
