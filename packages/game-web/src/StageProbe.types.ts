/** What the acceptance probe may read from the running stage. */
export interface StageProbeSnapshot {
  readonly scene: string
  readonly steps: number
  readonly cleared: boolean
  readonly score: number
  readonly playerX: number
  readonly stageClearedEvents: number
  readonly fps: number
}
