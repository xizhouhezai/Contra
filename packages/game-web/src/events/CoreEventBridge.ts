import type { CoreEvent } from '@contra/game-core'

type ShotEvent = Extract<CoreEvent, { type: 'shot' }>
type StageClearedEvent = Extract<CoreEvent, { type: 'stageCleared' }>

/** Callbacks the presentation layer registers for the events it currently renders. */
export interface CoreEventHandlers {
  readonly shot: (event: ShotEvent) => void
  readonly stageCleared: (event: StageClearedEvent) => void
}

/**
 * Routes the rule layer's event queue into presentation callbacks.
 *
 * M0 wires exactly two families — shot and stageCleared. The remaining seven keep
 * their shapes in game-core and land here with the combat systems in M1
 * (backlog.md T-M1-09), so an unconsumed event is never a silent contract break.
 */
export class CoreEventBridge {
  private readonly handlers: CoreEventHandlers

  constructor(handlers: CoreEventHandlers) {
    this.handlers = handlers
  }

  consume(events: readonly CoreEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'shot':
          this.handlers.shot(event)
          break
        case 'stageCleared':
          this.handlers.stageCleared(event)
          break
        default:
          break
      }
    }
  }
}
