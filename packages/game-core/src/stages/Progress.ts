/**
 * Campaign progress, persisted through the platform Storage port.
 *
 * Source of truth: docs/game/requirements/nonfunctional.md - REQ-NFR-006.
 *
 * The rule layer owns the shape; the platform layer owns where it lives. That
 * way the same progress model works in a browser, in a file, or in a test double
 * without the rules knowing which.
 */
/**
 * The storage shape progress needs.
 *
 * Declared here rather than imported from game-platform: the rule layer must not
 * depend on the adapters (ADR-0003). game-platform's Storage structurally
 * satisfies this, which is the direction the dependency is allowed to point.
 */
export interface ProgressStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

const KEY = 'contra.progress.v1'

export interface StageRecord {
  readonly stageId: string
  readonly cleared: boolean
  readonly bestScore: number
  readonly clears: number
}

export interface CampaignProgress {
  readonly stages: readonly StageRecord[]
  /** Highest stage index unlocked, 1-based. */
  readonly unlockedThrough: number
}

export function emptyProgress(stageIds: readonly string[]): CampaignProgress {
  return {
    stages: stageIds.map((stageId) => ({ stageId, cleared: false, bestScore: 0, clears: 0 })),
    unlockedThrough: 1,
  }
}

/** Reads progress, falling back to a fresh record when absent or unreadable. */
export function loadProgress(
  storage: ProgressStorage,
  stageIds: readonly string[],
): CampaignProgress {
  const raw = storage.get(KEY)
  if (raw === null) return emptyProgress(stageIds)

  try {
    const parsed = JSON.parse(raw) as Partial<CampaignProgress>
    if (!Array.isArray(parsed.stages)) return emptyProgress(stageIds)

    // Reconstitute against the current stage list: a stage added since the save
    // was written appears as uncleaned rather than being dropped.
    const byId = new Map(parsed.stages.map((record) => [record.stageId, record]))
    const stages = stageIds.map(
      (stageId) => byId.get(stageId) ?? { stageId, cleared: false, bestScore: 0, clears: 0 },
    )
    return { stages, unlockedThrough: parsed.unlockedThrough ?? 1 }
  } catch {
    // A corrupted save must not brick the game.
    return emptyProgress(stageIds)
  }
}

export function saveProgress(storage: ProgressStorage, progress: CampaignProgress): void {
  storage.set(KEY, JSON.stringify(progress))
}

/** Records one clear, keeping the best score and unlocking the next stage. */
export function recordClear(
  progress: CampaignProgress,
  stageId: string,
  score: number,
  nextStageIndex: number,
): CampaignProgress {
  const stages = progress.stages.map((record) =>
    record.stageId === stageId
      ? {
          stageId,
          cleared: true,
          bestScore: Math.max(record.bestScore, score),
          clears: record.clears + 1,
        }
      : record,
  )
  return {
    stages,
    unlockedThrough: Math.max(progress.unlockedThrough, nextStageIndex),
  }
}

/** True when the stage may be entered. */
export function isUnlocked(progress: CampaignProgress, stageIndex: number): boolean {
  return stageIndex <= progress.unlockedThrough
}

export function clearProgress(storage: ProgressStorage): void {
  storage.remove(KEY)
}

/** Ranks a run S/A/B/C from clear time and accuracy. */
export interface RunResult {
  readonly score: number
  readonly accuracy: number
  readonly elapsedSeconds: number
  readonly timeTargetSeconds: number
}

export type Grade = 'S' | 'A' | 'B' | 'C'

/**
 * Grades a run.
 *
 * Pace and accuracy carry equal weight, and both must be good for an S: a fast
 * sloppy run and a slow clean one both land at A. Thresholds are deliberately
 * reachable on a first clear of a well-tuned stage.
 */
export function gradeRun(result: RunResult): Grade {
  const pace = result.elapsedSeconds / result.timeTargetSeconds
  // Each axis scores 0-2; one axis alone cannot carry a grade above A.
  const paceScore = pace <= 1.1 ? 2 : pace <= 1.5 ? 1 : 0
  const accScore = result.accuracy >= 0.8 ? 2 : result.accuracy >= 0.6 ? 1 : 0
  const total = paceScore + accScore

  if (total >= 4) return 'S'
  // One perfect axis is enough for A even when the other is poor: a flawless
  // speed run and a flawless no-miss run are both A-worthy, only doing both is S.
  if (total >= 2 && (paceScore === 2 || accScore === 2)) return 'A'
  if (total >= 2) return 'B'
  return 'C'
}
