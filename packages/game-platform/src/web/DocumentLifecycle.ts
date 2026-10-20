import type { Lifecycle } from '../interfaces/Lifecycle.js'

/** The `document` surface the lifecycle adapter needs. */
export interface VisibilityTarget {
  readonly visibilityState: string
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

/** {@link Lifecycle} over the Page Visibility API. */
export class DocumentLifecycle implements Lifecycle {
  private readonly target: VisibilityTarget
  private readonly pauseCallbacks: (() => void)[] = []
  private readonly resumeCallbacks: (() => void)[] = []

  constructor(target: VisibilityTarget) {
    this.target = target
    this.target.addEventListener('visibilitychange', this.handleChange)
  }

  onPause(cb: () => void): void {
    this.pauseCallbacks.push(cb)
  }

  onResume(cb: () => void): void {
    this.resumeCallbacks.push(cb)
  }

  dispose(): void {
    this.target.removeEventListener('visibilitychange', this.handleChange)
    this.pauseCallbacks.length = 0
    this.resumeCallbacks.length = 0
  }

  private readonly handleChange = (): void => {
    const callbacks =
      this.target.visibilityState === 'hidden' ? this.pauseCallbacks : this.resumeCallbacks
    for (const cb of callbacks) cb()
  }
}

/** {@link Lifecycle} that never fires; used where the platform has no lifecycle. */
export class NoopLifecycle implements Lifecycle {
  onPause(): void {}
  onResume(): void {}
}
