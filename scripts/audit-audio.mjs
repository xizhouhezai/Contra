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

/**
 * Loop-seam and weapon-distinctness checks (M4 exit standards).
 *
 * These answer the two standards a file-presence check cannot: "每关有对应 BGM
 * 且循环无明显断点" and "8 种武器射击音效可辨".
 *
 * Two numeric approaches were tried first and both failed calibration - a
 * deliberately truncated track scored *better* than the shipped one, so the
 * numbers were measuring noise. What is used here instead is the weaker but
 * honest pair:
 *
 *   - Render the seam. The last 2s and first 2s of every track are drawn as one
 *     continuous waveform with the wrap marked, so a click would be a visible
 *     wall and a level jump a visible step. Written to .tmp/bgm-seams.png for a
 *     human to look at; the script only reports where it is.
 *   - Compare envelopes with a known-good control. A file must score 1.0 against
 *     itself; a real pair scoring that high would mean a duplicated file. The
 *     envelope is what separates gunshots by ear (crack vs sizzle), and unlike
 *     spectrum it is not shared across a sample pack.
 */
function decodeMono(file, rate) {
  const result = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file,
      '-ac',
      '1',
      '-ar',
      String(rate),
      '-f',
      's16le',
      '-',
    ],
    { maxBuffer: 512 * 1024 * 1024 },
  )
  if (result.status !== 0 || !result.stdout) return null
  const buf = result.stdout
  const n = Math.floor(buf.length / 2)
  const out = new Float64Array(n)
  for (let i = 0; i < n; i += 1) out[i] = buf.readInt16LE(i * 2)
  return out
}

function envelopeOf(file, points = 24) {
  const samples = decodeMono(file, 22050)
  if (samples === null || samples.length < points * 8) return null
  const size = Math.floor(samples.length / points)
  const env = new Array(points).fill(0)
  for (let i = 0; i < points; i += 1) {
    let total = 0
    for (let k = i * size; k < (i + 1) * size; k += 1) total += Math.abs(samples[k])
    env[i] = total / size
  }
  const peak = Math.max(...env)
  return peak > 0 ? env.map((v) => v / peak) : env
}

function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb)
}

const WEAPON_SFX = ['pulse', 'scatter', 'rifle', 'homing', 'pierce', 'cluster', 'laser', 'grenade']

if (process.argv.includes('--with-audio-quality')) {
  console.log('')
  console.log('== 武器音效可辨性（包络形状）==')
  const sfxDir = join(root, 'docs/game/requirements/assets/audio/sfx')
  const envs = new Map()
  for (const w of WEAPON_SFX) {
    const env = envelopeOf(join(sfxDir, `${w}.ogg`))
    if (env === null) {
      problems.push({ label: 'SFX', name: w, flags: ['无法解码包络'] })
      continue
    }
    envs.set(w, env)
  }

  // Control: a file against itself must be 1.0. Anything close to that between
  // two different weapons means one of them is a copy.
  const names = [...envs.keys()]
  if (names.length > 0) {
    const self = cosine(envs.get(names[0]), envs.get(names[0]))
    console.log(`  对照（自比，应 = 1.0000）：${self.toFixed(4)}`)
  }

  let closest = { score: -1, a: '', b: '' }
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const score = cosine(envs.get(names[i]), envs.get(names[j]))
      if (score > closest.score) closest = { score, a: names[i], b: names[j] }
    }
  }
  if (names.length > 1) {
    console.log(`  最相似一对：${closest.a} / ${closest.b} = ${closest.score.toFixed(4)}`)
    if (closest.score >= 0.999) {
      problems.push({
        label: 'SFX',
        name: `${closest.a}/${closest.b}`,
        flags: ['包络几乎相同，疑似复制'],
      })
    } else {
      console.log('  ✓ 八种武器音效时域形状两两不同，无复制品')
    }
  }

  console.log('')
  console.log('== BGM 循环接缝 ==')
  console.log('  波形图需人工查看（数值指标经校准不可信，见本文件注释）：')
  console.log('    node scripts/render-bgm-seams.mjs  ->  .tmp/bgm-seams.svg')
  console.log('  判定：红线（循环接缝）两侧波形应连续、幅度相近；出现垂直墙或电平突变才是断点。')
}

if (problems.length > 0) {
  console.log('')
  console.log(`✗ ${problems.length} 项不通过`)
  process.exitCode = 1
}
