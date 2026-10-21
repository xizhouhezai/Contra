import { DIFFICULTIES } from '@contra/game-core'
import { LocalStorageAdapter } from '@contra/game-platform'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  loadSettings,
  resetSettings,
  saveSettings,
} from '../settings/settings'

/**
 * Settings (T-M5-03).
 *
 * One column of rows: up and down to move, left and right to change, Enter to
 * confirm the destructive row, Esc to leave. Every change writes through
 * immediately rather than on exit - a player who closes the tab mid-adjustment
 * should keep what they set, and a setting does not need a save button.
 */
export class SettingsScene extends Phaser.Scene {
  private settings: GameSettings = DEFAULT_SETTINGS
  private readonly storage = new LocalStorageAdapter()
  private rows: { label: string; value: () => string }[] = []
  private labels: Phaser.GameObjects.Text[] = []
  private cursor = 0

  constructor() {
    super('Settings')
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background)
    this.settings = loadSettings(this.storage)
    this.cursor = 0
    this.labels = []

    this.rows = [
      { label: '主音量', value: () => `${Math.round(this.settings.masterVolume * 100)}%` },
      { label: '音效音量', value: () => `${Math.round(this.settings.sfxVolume * 100)}%` },
      { label: '难度', value: () => DIFFICULTIES[this.settings.difficulty].label },
      { label: '画质', value: () => this.settings.quality ?? '自动' },
      { label: '减少动效', value: () => (this.settings.accessibility.reduceMotion ? '开' : '关') },
      { label: '清除存档', value: () => '按 Enter 确认' },
    ]

    this.add
      .text(GAME_WIDTH / 2, 60, '设置', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)

    this.rows.forEach((row, index) => {
      const y = 130 + index * 42
      this.add.text(140, y, row.label, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: PALETTE.inkMuted,
      })
      this.labels.push(
        this.add
          .text(GAME_WIDTH - 140, y, row.value(), {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: PALETTE.hud,
          })
          .setOrigin(1, 0),
      )
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '↑↓ 选择 · ←→ 调整 · Enter 确认 · Esc 返回', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    this.input.keyboard?.on('keydown-UP', () => this.move(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.move(1))
    this.input.keyboard?.on('keydown-LEFT', () => this.adjust(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.adjust(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm())
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'))

    this.refresh()
  }

  private move(delta: number): void {
    this.cursor = (this.cursor + delta + this.rows.length) % this.rows.length
    this.refresh()
  }

  /** Steps a value; every change is persisted immediately. */
  private adjust(delta: number): void {
    const step = (value: number) =>
      Math.max(0, Math.min(1, Math.round((value + delta * 0.1) * 10) / 10))

    if (this.cursor === 0) {
      this.settings = { ...this.settings, masterVolume: step(this.settings.masterVolume) }
    } else if (this.cursor === 1) {
      this.settings = { ...this.settings, sfxVolume: step(this.settings.sfxVolume) }
    } else if (this.cursor === 2) {
      const order = ['casual', 'standard', 'hardcore'] as const
      const index = order.indexOf(this.settings.difficulty)
      const next = order[(index + delta + order.length) % order.length] ?? 'standard'
      this.settings = { ...this.settings, difficulty: next }
    } else if (this.cursor === 3) {
      const order = [null, 'high', 'medium', 'low'] as const
      const index = order.indexOf(this.settings.quality)
      const next = order[(index + delta + order.length) % order.length] ?? null
      this.settings = { ...this.settings, quality: next }
    } else if (this.cursor === 4) {
      this.settings = {
        ...this.settings,
        accessibility: {
          ...this.settings.accessibility,
          reduceMotion: !this.settings.accessibility.reduceMotion,
        },
      }
    } else {
      // The destructive row only reacts to Enter.
      return
    }

    saveSettings(this.storage, this.settings)
    this.refresh()
  }

  private confirm(): void {
    if (this.cursor !== 5) return
    resetSettings(this.storage)
    this.settings = DEFAULT_SETTINGS
    this.refresh()
  }

  private refresh(): void {
    this.rows.forEach((row, index) => {
      const label = this.labels[index]
      if (label === undefined) return
      label.setText(row.value())
      label.setColor(index === this.cursor ? PALETTE.alert : PALETTE.hud)
    })
  }
}
