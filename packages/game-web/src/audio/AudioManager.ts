import { LocalStorageAdapter } from '@contra/game-platform'
import type Phaser from 'phaser'
import { type GameSettings, loadSettings } from '../settings/settings'
import { type BgmKey, bgmForStage, type SfxKey } from './manifest'

/**
 * Audio playback.
 *
 * Kept behind one object so a scene never touches Phaser's sound manager
 * directly: muting, volume and the current track become one place to change,
 * and the rule layer stays unaware that sound exists at all (ADR-0003).
 */
export class AudioManager {
  private readonly scene: Phaser.Scene
  private currentBgm: Phaser.Sound.BaseSound | null = null
  private currentKey: string | null = null
  private muted = false
  /**
   * Base levels, before the player's settings scale them.
   *
   * Music sits well below effects on purpose: a loop runs for two minutes under
   * every fight and wants to stay out of the way, while a shot has to be
   * identifiable in a busy frame.
   */
  private readonly bgmBase = 0.4
  private readonly sfxBase = 0.7
  private settings: GameSettings

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.settings = loadSettings(LocalStorageAdapter.fromGlobal())
  }

  /**
   * Takes the player's volumes from the settings screen.
   *
   * Until this existed the settings screen wrote masterVolume and sfxVolume to
   * storage and nothing read them: two sliders that changed a percentage next to
   * themselves and had no effect on a single sound. The audio layer had its own
   * constants and never consulted the file.
   */
  applySettings(settings: GameSettings): void {
    this.settings = settings
    this.scene.sound.volume = settings.masterVolume
    // BaseSound does not declare setVolume; only the WebAudio and HTML5
    // implementations have it. The guard is the cast's entire purpose.
    const bgm = this.currentBgm as { setVolume?: (volume: number) => void } | null
    if (bgm !== null && typeof bgm.setVolume === 'function') bgm.setVolume(this.bgmVolume)
  }

  /** Effect level, already scaled by the player's master and effect sliders. */
  private get sfxVolume(): number {
    return this.sfxBase * this.settings.masterVolume * this.settings.sfxVolume
  }

  /**
   * Music level, scaled by the master slider.
   *
   * There is no separate music slider: the settings screen offers master and
   * effects, so music follows master alone. Adding a third slider is a product
   * decision, not something to invent here.
   */
  private get bgmVolume(): number {
    return this.bgmBase * this.settings.masterVolume
  }

  /** Plays a one-shot effect; silently does nothing when the key is absent. */
  playSfx(key: SfxKey): void {
    if (this.muted) return
    if (!this.scene.cache.audio.exists(key)) return
    this.scene.sound.play(key, { volume: this.sfxVolume })
  }

  /**
   * Starts a stage's background loop.
   *
   * A track already playing is left alone: restarting the same loop on every
   * stage entry would cut it at an arbitrary point.
   */
  playStageBgm(stageIndex: number, isBoss: boolean): void {
    const key = bgmForStage(stageIndex, isBoss)
    this.playBgm(key)
  }

  playBgm(key: BgmKey): void {
    if (this.currentKey === key) return
    this.stopBgm()
    if (!this.scene.cache.audio.exists(key)) return

    const sound = this.scene.sound.add(key, { loop: true, volume: this.bgmVolume })
    sound.play()
    this.currentBgm = sound
    this.currentKey = key
  }

  stopBgm(): void {
    if (this.currentBgm !== null) {
      this.currentBgm.stop()
      this.currentBgm.destroy()
      this.currentBgm = null
      this.currentKey = null
    }
  }

  /**
   * Ducks the music for a beat and restores it.
   *
   * Used on a boss phase change: the spec asks for a half-second of silence
   * under the cutscene beat, which reads as punctuation rather than a gap.
   */
  silentBeat(seconds = 0.5): void {
    const sound = this.currentBgm
    if (sound === null) return

    const bgm = sound as Phaser.Sound.WebAudioSound
    if (typeof bgm.setVolume === 'function') bgm.setVolume(0)
    this.scene.time.delayedCall(seconds * 1000, () => {
      if (typeof bgm.setVolume === 'function') bgm.setVolume(this.bgmVolume)
    })
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.scene.sound.mute = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }
}
