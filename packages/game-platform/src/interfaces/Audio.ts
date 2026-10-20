/** Mixer channels the game can address. */
export type AudioChannel = 'master' | 'bgm' | 'sfx'

/** Audio output (docs/game/design/modules.md §适配层接口). */
export interface AudioPort {
  playBgm(trackId: string): void
  stopBgm(): void
  playSfx(sfxId: string): void
  setVolume(channel: AudioChannel, value: number): void
}
