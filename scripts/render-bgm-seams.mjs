#!/usr/bin/env node
/**
 * Renders the loop seam of every stage track so it can be looked at.
 *
 * M4's exit standard includes "每关有对应 BGM 且循环无明显断点". Phaser loops an
 * ogg by starting it again from zero (AudioManager uses `loop: true`), so the
 * join a player hears is literally `end -> beginning`.
 *
 * Two numeric metrics were built for this and both died in calibration: a
 * deliberately truncated file scored *better* than the shipping one on both, so
 * they were measuring noise rather than a discontinuity. That is the honest
 * reason this script draws a picture instead of emitting a verdict - the numbers
 * could not be trusted, and an untrustworthy threshold is worse than no threshold.
 *
 * What the picture shows, per track, in one row:
 *   last 2s  |  first 2s        (red line = the wrap)
 *
 * A clean loop reads as ordinary music across the red line. A click is a
 * vertical wall at it; a level mismatch is an obvious step in height between the
 * two halves. Read the sheet, do not average it.
 *
 * Usage:
 *   node scripts/render-bgm-seams.mjs [output.png]
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const FFMPEG =
  process.env.FFMPEG_PATH ?? 'C:/Users/yr137/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe'
const BGM = join(root, 'docs/game/requirements/assets/audio/bgm')
const OUT = resolve(process.argv[2] ?? join(root, '.tmp/bgm-seams.svg'))

const RATE = 4000
const SPAN_SECONDS = 2.0
const ROW_HEIGHT = 90
const WIDTH = 900

/** Decode to mono samples at a rate that is plenty for envelope-level drawing. */
function decode(file) {
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
      String(RATE),
      '-f',
      's16le',
      '-',
    ],
    { maxBuffer: 256 * 1024 * 1024 },
  )
  if (result.status !== 0 || !result.stdout) return null
  const buf = result.stdout
  const n = Math.floor(buf.length / 2)
  const out = new Int16Array(n)
  for (let i = 0; i < n; i += 1) out[i] = buf.readInt16LE(i * 2)
  return out
}

/**
 * Builds an SVG rather than a PNG: no image library is needed, the output is
 * small, and a vector keeps the waveform crisp when someone zooms into the seam.
 */
function render(rows) {
  const height = ROW_HEIGHT * rows.length + 40
  const parts = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">`,
  )
  parts.push(`<rect width="${WIDTH}" height="${height}" fill="#f5f3ee"/>`)
  parts.push(
    `<text x="8" y="18" font-family="monospace" font-size="12" fill="#1a1a1a">` +
      `last ${SPAN_SECONDS}s | first ${SPAN_SECONDS}s   (red = loop wrap)   flat = silence at both ends</text>`,
  )

  rows.forEach((row, index) => {
    const y = 30 + index * ROW_HEIGHT
    const mid = y + (ROW_HEIGHT - 26) / 2
    const half = (ROW_HEIGHT - 26) / 2 - 2
    const span = WIDTH / 2 - 8

    parts.push(`<line x1="0" y1="${y - 2}" x2="${WIDTH}" y2="${y - 2}" stroke="#d2d0ca"/>`)

    const peak = Math.max(
      1,
      ...row.tail.map((v) => Math.abs(v)),
      ...row.head.map((v) => Math.abs(v)),
    )

    const polyline = (samples, startX) => {
      const pts = []
      for (let i = 0; i < span; i += 1) {
        const idx = Math.min(samples.length - 1, Math.floor((i * samples.length) / span))
        const amp = (samples[idx] / peak) * half
        pts.push(`${(startX + i).toFixed(1)},${(mid - amp).toFixed(1)}`)
      }
      return `<polyline points="${pts.join(' ')}" fill="none" stroke="#466ea0" stroke-width="0.7"/>`
    }

    parts.push(polyline(row.tail, 8))
    parts.push(polyline(row.head, 8 + span))
    parts.push(
      `<line x1="${8 + span}" y1="${y}" x2="${8 + span}" y2="${y + ROW_HEIGHT - 26}" stroke="#c83c28"/>`,
    )
    parts.push(
      `<text x="12" y="${y + 11}" font-family="monospace" font-size="11" fill="#1a1a1a">${row.name}</text>`,
    )
    parts.push(
      `<text x="${16 + span}" y="${y + 11}" font-family="monospace" font-size="10" fill="#787878">head &gt;</text>`,
    )
  })

  parts.push('</svg>')
  return parts.join('\n')
}

function main() {
  let files
  try {
    files = readdirSync(BGM)
      .filter((f) => f.endsWith('.ogg'))
      .sort()
  } catch {
    console.error(`no bgm folder at ${BGM}`)
    return 1
  }
  if (files.length === 0) {
    console.error('no tracks found')
    return 1
  }

  const rows = []
  for (const name of files) {
    const samples = decode(join(BGM, name))
    if (samples === null) {
      console.error(`  failed to decode ${name}`)
      continue
    }
    const n = Math.min(Math.floor(SPAN_SECONDS * RATE), Math.floor(samples.length / 2))
    rows.push({
      name: name.replace('.ogg', ''),
      tail: Array.from(samples.subarray(samples.length - n)),
      head: Array.from(samples.subarray(0, n)),
    })
  }

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, render(rows))
  console.log(`wrote ${OUT} (${rows.length} tracks)`)
  console.log('Open it and look at the red line: continuous = clean loop,')
  console.log('a vertical wall or a step in height = an audible break.')
  return 0
}

process.exit(main())
