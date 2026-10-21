/**
 * Builds a World from a StageDefinition and reports how the run is going.
 *
 * Source of truth: docs/game/requirements/stages.md - 关卡数据驱动 (T-M2-01).
 *
 * The runner is deliberately thin: it turns data into a WorldOptions and reads
 * back the World's own cleared flag. No stage-specific branching belongs here -
 * if a new stage needs new behaviour, it needs a new field in the definition.
 */

import { type CoreEvent, World, type WorldSnapshot } from '../core.js'
import type { StageDefinition } from '../data/stageTypes.js'

/** Progress through one stage. */
export interface StageProgress {
  readonly stageId: string
  readonly steps: number
  readonly score: number
  readonly cleared: boolean
  readonly elapsedSeconds: number
  /** Ratio of elapsed time to the stage's designed time; 1 means on target. */
  readonly paceRatio: number
}

export class StageRunner {
  private readonly definition: StageDefinition
  private readonly world: World

  constructor(definition: StageDefinition) {
    this.definition = definition
    this.world = new World({
      spawn: definition.spawn,
      platforms: [...definition.platforms],
      targets: [...definition.targets],
      exit: definition.exit,
      stage: {
        id: definition.id,
        exit: definition.exit,
        bounceWalls: [...definition.bounceWalls],
      },
    })
  }

  get stage(): StageDefinition {
    return this.definition
  }

  get currentWorld(): World {
    return this.world
  }

  /** Advances one frame and returns the events the rule layer produced. */
  update(dt: number, input: Parameters<World['update']>[1]): readonly CoreEvent[] {
    return this.world.update(dt, input)
  }

  snapshot(): WorldSnapshot {
    return this.world.snapshot()
  }

  /** How the run is going, including pacing against the designed time. */
  progress(): StageProgress {
    const steps = this.world.steps
    const elapsedSeconds = steps / 60
    return {
      stageId: this.definition.id,
      steps,
      score: this.world.currentScore,
      cleared: this.world.clearedStage,
      elapsedSeconds,
      paceRatio: elapsedSeconds / this.definition.timeTargetSeconds,
    }
  }
}

/** Looks up a stage by id in a catalogue. */
export function findStage(
  catalogue: readonly StageDefinition[],
  id: string,
): StageDefinition | undefined {
  return catalogue.find((stage) => stage.id === id)
}
