#!/usr/bin/env node
/**
 * Measures what the audio actually is.
 *
 * "There is a file called bgm-07-forge.ogg" is not evidence that stage 7 has
 * music. A file can be empty, clipped, or two seconds of silence with an ogg
 * header, and every one of those passes a test that only checks the name exists.
 *
 * So this asks ffmpeg what is in each file: how long it is, how loud, whether it
 * has silent stretches. A track that is mostly silence is a bug at the asset
 * level that no unit test would ever see.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const FFMPEG = 'C:/Users/yr137/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe'

function runFfmpeg(args) {
  // spawnSync rather than execFileSync: ffmpeg writes its whole report to stderr
  // and stdout comes back empty, so a helper that returns stdout measures nothing
  // and reports every file as zero seconds long.
  const result = spawnSync(FFMPEG, args, { encoding: 'utf8' })
  return (result.stdout ?? '') + (result.stderr ?? '')
}

function analyse(file) {
  const volume = runFfmpeg(['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'])
  const silence = runFfmpeg([
    '-hide_banner',
    '-i',
    file,
    '-af',
    'silencedetect=n=-50dB:d=1',
    '-f',
    'null',
    '-',
  ])

  const d = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(volume)
  const seconds = d === null ? 0 : Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3])
  const mean = /mean_volume: (-?\d+\.\d+) dB/.exec(volume)
  const max = /max_volume: (-?\d+\.\d+) dB/.exec(volume)
  let silentSeconds = 0
  for (const m of silence.matchAll(/silence_duration: (\d+\.\d+)/g)) silentSeconds += Number(m[1])

  return {
    seconds,
    mean: mean === null ? null : Number(mean[1]),
    max: max === null ? null : Number(max[1]),
    silentSeconds,
  }
}

const dirs = [
  { label: 'BGM', dir: join(root, 'docs/game/requirements/assets/audio/bgm') },
  { label: 'SFX', dir: join(root, 'docs/game/requirements/assets/audio/sfx') },
]

const problems = []
for (const entry of dirs) {
  console.log('')
  console.log(`== ${entry.label} ==`)
  const files = readdirSync(entry.dir)
    .filter((f) => f.endsWith('.ogg'))
    .sort()
  for (const name of files) {
    const a = analyse(join(entry.dir, name))
    const silentShare = a.seconds > 0 ? a.silentSeconds / a.seconds : 1
    const flags = []
    // Short is correct for several effects: a hit blip is 0.17s by design. Only
    // an effect too short to be heard at all is a defect.
    if (a.seconds < 0.05) flags.push('过短到听不见')
    if (a.silentSeconds > 0.5 && entry.label === 'SFX') flags.push('含静音段')
    if (silentShare > 0.9 && entry.label === 'BGM') flags.push('几乎全是静音')
    if (a.mean !== null && a.mean < -40) flags.push('音量过低')
    // 0dBFS is the ceiling; anything at it was clipped when it was written and
    // cannot be undone in the mixer.
    if (a.max !== null && a.max >= 0) flags.push('削波')
    const line =
      name.padEnd(24) +
      a.seconds.toFixed(2).padStart(6) +
      's  mean=' +
      String(a.mean).padStart(7) +
      'dB  max=' +
      String(a.max).padStart(7) +
      'dB  silent=' +
      a.silentSeconds.toFixed(2) +
      's'
    console.log(line + (flags.length > 0 ? `  << ${flags.join(', ')}` : ''))
    if (flags.length > 0) problems.push({ label: entry.label, name, flags })
  }
}

console.log('')
console.log(problems.length === 0 ? '✓ 所有音频都有实际内容' : `✗ ${problems.length} 个文件有问题`)
