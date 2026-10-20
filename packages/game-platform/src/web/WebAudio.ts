import type { AudioChannel, AudioPort } from '../interfaces/Audio.js'

/** Minimal shape of `HTMLAudioElement` the adapter touches. */
export interface AudioElementLike {
  volume: number
  currentTime: number
  play(): Promise<void> | void
  pause(): void
}

/** Builds one looping BGM element per track; injected so tests stay DOM-free. */
export type AudioFactory = (trackId: string) => AudioElementLike

/**
 * {@link AudioPort} over HTMLAudioElement.
 *
 * Volumes are kept as a channel mix applied at play time, which is what lets
 * settings change the mix without restarting the current track.
 */
export class WebAudioAdapter implements AudioPort {
  private readonly factory: AudioFactory
  private readonly volumes: Record<AudioChannel, number> = { master: 0.8, bgm: 0.6, sfx: 1 }
  private bgm: { trackId: string; element: AudioElementLike } | null = null

  constructor(factory: AudioFactory) {
    this.factory = factory
  }

  playBgm(trackId: string): void {
    if (this.bgm?.trackId === trackId) return
    this.stopBgm()
    const element = this.factory(trackId)
    element.volume = this.effectiveVolume('bgm')
    void element.play()
    this.bgm = { trackId, element }
  }

  stopBgm(): void {
    if (this.bgm === null) return
    this.bgm.element.pause()
    this.bgm.element.currentTime = 0
    this.bgm = null
  }

  playSfx(sfxId: string): void {
    const element = this.factory(sfxId)
    element.volume = this.effectiveVolume('sfx')
    void element.play()
  }

  setVolume(channel: AudioChannel, value: number): void {
    this.volumes[channel] = clamp01(value)
    if (this.bgm !== null) this.bgm.element.volume = this.effectiveVolume('bgm')
  }

  /** Volume of a channel after the master multiplier (GDD §2.4). */
  volumeOf(channel: AudioChannel): number {
    return this.volumes[channel]
  }

  private effectiveVolume(channel: Exclude<AudioChannel, 'master'>): number {
    return this.volumes.master * this.volumes[channel]
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
