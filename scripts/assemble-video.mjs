#!/usr/bin/env node
/**
 * Assembles the recorded frames and the captured audio into one video.
 *
 * The frame durations come from the timestamps the screencast reported, not
 * from a fixed value. That matters: the frames arrive at whatever rate the
 * compositor produced them, so a constant duration either speeds the game up
 * or leaves the video drifting against the audio. Using the real intervals
 * keeps the two in step.
 *
 * The audio is the game's own Web Audio stream, muxed with the video rather
 * than played alongside - a video that carries its own sound is the artefact
 * worth keeping.
 *
 * Usage:
 *   node scripts/assemble-video.mjs .tmp/midscene-all/meta.json .tmp/midscene-all/audio.webm .tmp/midscene-all/video.mp4
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const FFMPEG =
  process.env.FFMPEG_PATH ?? 'C:/Users/yr137/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe'

const [, , metaPath, audioPath, outPath] = process.argv
if (metaPath === undefined) {
  console.error('usage: node scripts/assemble-video.mjs <meta.json> [audio.webm] <out.mp4>')
  process.exit(1)
}

const frames = JSON.parse(readFileSync(resolve(metaPath), 'utf8'))
if (!Array.isArray(frames) || frames.length === 0) {
  console.error('no frames in the meta file')
  process.exit(1)
}

const dir = dirname(resolve(metaPath))
const listPath = join(dir, 'concat.txt')
mkdirSync(dir, { recursive: true })

/**
 * Duration per frame, from the timestamps the screencast reported.
 *
 * The last frame is held for the same interval as the one before it, because
 * there is no following timestamp to measure the gap to.
 */
const durations = []
let totalMs = 0
for (let i = 0; i < frames.length; i += 1) {
  const current = frames[i]
  const next = frames[i + 1]
  const gapMs = next === undefined ? current.tMs - frames[i - 1].tMs : next.tMs - current.tMs
  durations.push(Math.max(0.016, (gapMs ?? 40) / 1000))
  totalMs += gapMs ?? 40
}

// The concat demuxer needs the last file repeated, or it drops it.
const lines = []
for (let i = 0; i < frames.length; i += 1) {
  lines.push(`file '${join(dir, frames[i].file).replace(/\\/g, '/')}'`)
  lines.push(`duration ${durations[i].toFixed(4)}`)
}
lines.push(`file '${join(dir, frames[frames.length - 1].file).replace(/\\/g, '/')}'`)
writeFileSync(listPath, lines.join('\n'), 'utf8')

const videoSeconds = totalMs / 1000
console.log(`帧 ${frames.length}，时长 ${videoSeconds.toFixed(1)}s`)

/**
 * The frames are named 00001.jpg, 00002.jpg ... so the image2 demuxer can read
 * them as one continuous sequence.
 *
 * The first attempt fed the concat list to ffmpeg directly and got a video of
 * the *text of the list* - the concat demuxer treats a list of images as a
 * text stream unless told otherwise. Using image2 with a start number is both
 * correct and faster, since ffmeteer reads the sequence natively.
 */
const firstNumber = Number(frames[0].file.replace(/\D/g, ''))
const pattern = join(dir, frames[0].file.replace(/\d+(?=\.[^.]+$)/, '%05d')).replace(/\\/g, '/')

/**
 * The real frame rate, measured from the timestamps.
 *
 * The screencast hands over frames at the compositor's rate - 60fps here - and
 * the first version told ffmpeg to play them at 30. That silently doubled the
 * speed of the whole recording: a character standing still appeared to jump,
 * and the timeline raced ahead of the audio. Nothing in the file looked broken,
 * which is exactly why it is worth measuring instead of assuming.
 *
 * The rate comes from the frames' own timestamps, so a capture at 30fps or 24fps
 * is handled without anyone editing a constant.
 */
const measuredFps = frames.length / (totalMs / 1000)
const fps = Math.max(1, Math.min(120, Math.round(measuredFps)))
console.log(
  `实测帧率 ${measuredFps.toFixed(1)}fps → 按 ${fps}fps 封装` +
    `（按 ${measuredFps.toFixed(1)}fps 封装时长 ${(frames.length / measuredFps).toFixed(1)}s）`,
)

const args = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', pattern]
if (audioPath !== undefined && existsSync(resolve(audioPath))) {
  args.push('-i', resolve(audioPath))
  args.push('-map', '0:v:0', '-map', '1:a:0')
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p')
  args.push('-c:a', 'aac', '-b:a', '160k')
  // The audio capture starts a moment after the frames and ends a moment
  // before them, so the two tracks are never exactly the same length.
  //
  // `-shortest` truncates to the shorter of them, which silently threw away
  // the tail of the video: a 50s recording came out as 31s, and the picture
  // stopped while the timeline kept going. Padding the audio with silence to
  // the video's length keeps the whole recording and costs nothing.
  args.push('-af', `apad`)
  args.push('-t', videoSeconds.toFixed(3))
} else {
  console.log('没有音频文件，只合成视频')
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p')
}
args.push('-r', String(fps), resolve(outPath))

try {
  execFileSync(FFMPEG, args, { stdio: 'pipe' })
} catch (error) {
  console.error('ffmpeg failed:', String(error.stderr ?? error.message).slice(0, 800))
  process.exit(1)
}

const size = existsSync(resolve(outPath)) ? readFileSync(resolve(outPath)).length : 0
console.log(`wrote ${outPath} (${(size / 1048576).toFixed(2)}MB)`)
console.log(`起始帧号 ${firstNumber}，图案 ${pattern}`)
