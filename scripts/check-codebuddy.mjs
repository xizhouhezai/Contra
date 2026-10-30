#!/usr/bin/env node
/**
 * Is the CodeBuddy model usable right now?
 *
 * This exists because "the model stopped working" has cost several sessions to
 * diagnose. The failure is not a normal API error: the upstream gateway does a
 * literal content check on the outbound request and answers HTTP 400 / code 11128
 * ("Illegal API invocation from an unapproved channel") when it decides the
 * caller is not an official client. The host's system prompt trips that check,
 * and the installed plugin masks it before sending.
 *
 * That makes "is it up" a three-part question, and a single request cannot answer
 * it - a failure could be the account, the endpoint, or the masking:
 *
 *   1. ACCOUNT   a trivial request with a toy system prompt. If this fails, the
 *                problem is credentials or the service, not the harness.
 *   2. MASKING   the live system prompt, as the plugin would send it. This is the
 *                real-world case, and the one that historically broke.
 *   3. CONTROL   the same prompt with the masking skipped. Expected to FAIL with
 *                11128. If it unexpectedly succeeds, the upstream fingerprint has
 *                moved and the plugin's rewrite is no longer needed (or is now
 *                masking something else for no reason) - worth knowing.
 *
 * Part 3 is why this is not just a ping: it proves the masking is still what
 * makes the connection work, instead of assuming it.
 *
 * The system prompt is read from the newest session log so the test uses what the
 * harness is actually sending today, not a copy pasted once and left to rot.
 *
 * Usage:
 *   node scripts/check-codebuddy.mjs              # all three checks
 *   node scripts/check-codebuddy.mjs --quick      # account only, no session log
 *   node scripts/check-codebuddy.mjs --model=<id>
 *
 * Exit code: 0 when the model answers the masked live prompt, 1 otherwise.
 * Nothing printed identifies the account: no token, no uid, no host.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import * as zlib from 'node:zlib'

/**
 * zstd decoding needs Node >= 22; this machine also has a Node 16 on PATH which
 * `pnpm <script>` uses. Importing the symbol directly turned that into a crash at
 * module load with a message that said nothing useful. Resolved lazily so the
 * account check still works and the failure names the real cause.
 */
const zstdDecompressSync =
  typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : null

const HOME = homedir()
const AUTH_FILE = join(HOME, '.dsh', 'codebuddy-auth.json')
const PLUGIN_DIR = join(
  HOME,
  '.dsh',
  'profiles',
  'desktop',
  'node_modules',
  '@tnnevol',
  'dsh-codebuddy',
  'lib',
)
const PLUGIN = join(PLUGIN_DIR, 'index.js')

const argv = process.argv.slice(2)
const quick = argv.includes('--quick')
const modelArg = argv.find((a) => a.startsWith('--model='))
const MODEL = modelArg === undefined ? 'deepseek-v4.1-flash' : modelArg.split('=')[1]

/** The paragraph the upstream check has been matching since 2026-10-29. */
const AT_PATH_PARAGRAPH = /Tokens prefixed with [@\uFF20][\s\S]*?quotes a path containing spaces\./

/**
 * The plugin's rewrites, transcribed from the installed lib/index.js.
 *
 * Transcribed rather than extracted: the first attempt parsed the function out of
 * the plugin source with brace counting, and regex literals containing `{`/`}`
 * cut the declaration in half - it produced a broken function that still ran,
 * which is the worst kind of probe. Four literal substitutions are checkable by
 * eye against the plugin, and the check below prints whether they fired.
 */
const REWRITES = [
  {
    name: 'identity sentence',
    from: /^You are an AI agent powered by DeepSeek Harness\./i,
    to: 'You are an AI agent powered via DeepSeek Harness.',
  },
  {
    name: 'product name + interaction form',
    from: /DeepSeek Harness\s+(?:Web GUI|Web UI|Desktop App(?:lication)?|desktop app(?:lication)?|Desktop|desktop|Web|IDE|TUI|GUI|CLI|App(?:lication)?|app(?:lication)?)\b/gi,
    to: 'CodeBuddy Code CLI',
  },
  {
    name: 'at-path paragraph',
    from: AT_PATH_PARAGRAPH,
    to:
      'Path tokens the user references directly resolve against the workspace root: relative ' +
      'paths from there, absolute paths identify files or directories. A trailing slash marks a ' +
      'directory; list it when its contents matter. Anything else names a file: read it before ' +
      'you claim to have inspected it. A quoted form marks a path containing spaces.',
  },
  {
    name: 'ascii at-sign',
    from: /@/g,
    to: '\uFF20',
  },
]

function maskLikePlugin(text) {
  let out = text
  const fired = []
  for (const rule of REWRITES) {
    // A global regex keeps lastIndex between calls; reset it before testing.
    rule.from.lastIndex = 0
    if (!rule.from.test(out)) continue
    rule.from.lastIndex = 0
    out = out.replace(rule.from, rule.to)
    fired.push(rule.name)
  }
  return { text: out, fired }
}

/**
 * Read the newest session's system prompt, or null when unavailable.
 *
 * Returns null rather than throwing when the runtime cannot decompress the log:
 * the caller turns that into "check 2 skipped, reason: node too old", which is
 * actionable, where an exception at this point would look like the model is down.
 */
function liveSystemPrompt() {
  if (zstdDecompressSync === null) {
    console.log(
      `  (跳过：当前 Node ${process.versions.node} 不支持 zstd，需要 >= 22；` +
        '用 node 22 运行才能检查真实提示)',
    )
    return null
  }
  const sessionsDir = join(HOME, '.dsh', 'sessions')
  if (!existsSync(sessionsDir)) return null

  let newest = null
  for (const workspace of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!workspace.isDirectory()) continue
    const workspaceDir = join(sessionsDir, workspace.name)
    let entries
    try {
      entries = readdirSync(workspaceDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const session of entries) {
      if (!session.isDirectory()) continue
      const file = join(workspaceDir, session.name, 'session.v4.jsonl.zstd')
      if (!existsSync(file)) continue
      const mtimeMs = statSync(file).mtimeMs
      if (newest === null || mtimeMs > newest.mtimeMs) newest = { file, mtimeMs }
    }
  }
  if (newest === null) return null

  const buf = readFileSync(newest.file)
  const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
  const offsets = []
  let at = 0
  for (;;) {
    const found = buf.indexOf(magic, at)
    if (found < 0) break
    offsets.push(found)
    at = found + 1
  }
  const parts = []
  for (let k = 0; k < offsets.length; k += 1) {
    const from = offsets[k]
    const to = k + 1 < offsets.length ? offsets[k + 1] : buf.length
    try {
      parts.push(zstdDecompressSync(buf.subarray(from, to)))
    } catch {
      // A truncated final frame is normal for a live session.
    }
  }

  let systemText = null
  for (const line of Buffer.concat(parts).toString('utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type !== 'system/message') continue
    systemText = (event.data?.message?.content ?? []).map((c) => c.text ?? '').join('')
  }
  return systemText
}

/** Pull the first string value whose key matches, without knowing the layout. */
function findField(obj, pattern, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return undefined
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > 0 && pattern.test(key)) return value
    const nested = findField(value, pattern, depth + 1)
    if (nested !== undefined) return nested
  }
  return undefined
}

/**
 * Service address and client identity for one account.
 *
 * The endpoint is not a constant: the plugin resolves it per account
 * (`resolveEntryEndpoint`), because a WorkBuddy account and a CLI account live
 * behind different hosts. Sending a WorkBuddy token to the CLI host is the kind
 * of mismatch that produces intermittent failures - the account works, the
 * request does not, and it depends on which account happens to be active.
 *
 * The client identity has to match the account for the same reason: the plugin
 * notes that using the CLI identity for a WorkBuddy account still answers 200
 * but attributes the traffic to the wrong client.
 */
const CLIENT_ENDPOINTS = {
  cli: 'https://copilot.tencent.com',
  workbuddy: 'https://www.workbuddy.cn',
}

/** Describe one account entry: where it lives and what identity it sends. */
function describeAccount(entry, activeId, pluginVersion) {
  const client = entry.client ?? 'cli'
  const explicit = (entry.endpoint ?? '').trim().replace(/\/+$/, '')
  const endpoint =
    explicit.length > 0 ? explicit : (CLIENT_ENDPOINTS[client] ?? CLIENT_ENDPOINTS.cli)
  // The account's own client version; the plugin's bundled CLI version is only
  // right for accounts that logged in through the CLI.
  const accountVersion = entry.clientVersion ?? ''
  return {
    id: entry.id,
    active: entry.id === activeId,
    client,
    endpoint,
    version: accountVersion.length > 0 ? accountVersion : pluginVersion,
    token: findField(entry, /^access_?token$/i),
    uid: findField(entry.account, /^uid$|^userId$/i) ?? findField(entry, /^uid$/i),
    domain: findField(entry, /^domain$/i) ?? 'codebuddy.ai',
    enterpriseId: findField(entry, /^enterpriseId$/i),
    machineId: entry.fingerprint?.machineId,
    sessionId: entry.fingerprint?.sessionId,
    expired: typeof entry.auth?.expiresAt === 'number' ? Date.now() > entry.auth.expiresAt : false,
  }
}

/**
 * Every account, active first.
 *
 * More than one account can be configured and they fail for different reasons -
 * one gets rate limited (429 / code 6004) while the other serves fine. Checking
 * only the active one therefore reports "CodeBuddy is down" when it is merely
 * that one account is throttled, and the active account can change underneath
 * the check.
 */
function allAccounts() {
  const auth = JSON.parse(readFileSync(AUTH_FILE, 'utf8'))
  const source = readFileSync(PLUGIN, 'utf8')
  const pluginVersion = /CODEBUDDY_CLI_VERSION\s*=\s*"([^"]+)"/.exec(source)?.[1] ?? ''
  const described = auth.accounts.map((entry) =>
    describeAccount(entry, auth.activeId, pluginVersion),
  )
  return described.sort((a, b) => Number(b.active) - Number(a.active))
}

async function askOne(creds, systemPrompt) {
  const started = Date.now()
  const res = await fetch(`${creds.endpoint}/v2/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'X-Domain': creds.domain,
      'X-User-Id': creds.uid,
      ...(creds.enterpriseId ? { 'X-Enterprise-Id': creds.enterpriseId } : {}),
      ...(creds.machineId
        ? { 'X-Machine-ID': creds.machineId, 'X-Session-ID': creds.sessionId }
        : {}),
      'X-IDE-Type': creds.client,
      'X-IDE-Name': creds.client,
      'X-IDE-Version': creds.version,
      'content-type': 'application/json',
      accept: 'text/event-stream',
      'user-agent': `${creds.client}/${creds.version} CodeBuddy/${creds.version}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'What is 17 + 25? Reply with the number and nothing else.' },
      ],
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 512,
    }),
  })

  const text = await res.text()
  const elapsed = (Date.now() - started) / 1000
  const code = /"code":(\d+)/.exec(text)
  if (code !== null) {
    return {
      status: res.status,
      elapsed,
      code: Number(code[1]),
      message: /"msg":"([^"]+)"/.exec(text)?.[1] ?? '',
    }
  }

  let content = ''
  let reasoning = ''
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data: ')) continue
    const payload = line.slice(6).trim()
    if (payload === '[DONE]') continue
    try {
      const chunk = JSON.parse(payload)
      const delta = chunk.choices?.[0]?.delta ?? {}
      if (delta.content) content += delta.content
      if (delta.reasoning_content) reasoning += delta.reasoning_content
    } catch {
      // A keep-alive or a partial frame.
    }
  }
  return { status: res.status, elapsed, content, reasoning }
}

const results = []
function report(label, ok, detail) {
  results.push({ label, ok, detail })
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(34)} ${detail}`)
}

async function main() {
  if (!existsSync(AUTH_FILE)) {
    console.error(`no credentials at ${AUTH_FILE}`)
    return 1
  }
  if (!existsSync(PLUGIN)) {
    console.error(`plugin not installed at ${PLUGIN}`)
    return 1
  }

  const accounts = allAccounts()
  console.log(`accounts : ${accounts.length}`)
  console.log(`model    : ${MODEL}`)
  console.log()

  // 0. Which accounts can serve a request at all.
  //
  //    Done per account because they fail for different reasons - one can be
  //    rate limited while the other is fine - and because the "active" account
  //    can change between runs. A single-account check would report "CodeBuddy
  //    is down" when it is only that one account is throttled.
  const usable = []
  for (const account of accounts) {
    if (account.expired) {
      console.log(
        `  SKIP ${(account.client + (account.active ? ' (active)' : '')).padEnd(20)} token 已过期`,
      )
      continue
    }
    if (account.token === undefined) {
      console.log(
        `  SKIP ${(account.client + (account.active ? ' (active)' : '')).padEnd(20)} 没有 token`,
      )
      continue
    }
    const probe = await askOne(account, 'You are a helpful assistant.')
    const ok = probe.status === 200 && (probe.content ?? '').trim().length > 0
    console.log(
      `  ${ok ? 'OK  ' : 'FAIL'} ${(account.client + (account.active ? ' (active)' : '')).padEnd(20)} ` +
        `${account.endpoint.replace('https://', '')}  ` +
        (ok
          ? `${probe.elapsed.toFixed(1)}s`
          : `HTTP ${probe.status} code=${probe.code ?? '-'} ${probe.message ?? ''}`),
    )
    if (ok) usable.push(account)
  }
  console.log()

  if (usable.length === 0) {
    console.log('FAIL: 没有账号可用')
    console.log('  所有账号都失败时，先看是 429（限流，等一会）还是 401（凭据过期）。')
    return 1
  }

  // Use the first account that answered - the active one when it works.
  const creds = usable[0]
  console.log(`using    : ${creds.client}${creds.active ? ' (active)' : ''} @ ${creds.endpoint}`)
  console.log()

  // 1. Account and service reachable at all.
  report(
    '1. 账号与端点',
    true,
    `${usable.length}/${accounts.length} 个账号可用，使用 ${creds.client}`,
  )

  if (quick) return finish()

  // 2. The real case: today's system prompt, masked the way the plugin masks it.
  const systemText = liveSystemPrompt()
  if (systemText === null) {
    report('2. 真实系统提示', false, '读不到会话日志，无法构造真实请求')
    return finish()
  }
  const masked = maskLikePlugin(systemText)
  const live = await askOne(creds, masked.text)
  report(
    '2. 真实系统提示（已打码）',
    live.status === 200 && (live.content ?? '').trim().length > 0,
    live.code !== undefined
      ? `HTTP ${live.status} code=${live.code} ${live.message}`
      : `HTTP ${live.status} ${live.elapsed.toFixed(1)}s 回答=${JSON.stringify((live.content ?? '').slice(0, 20))}`,
  )
  console.log(`      原文 ${systemText.length} 字符 → 打码后 ${masked.text.length} 字符`)
  console.log(
    `      命中的改写规则：${masked.fired.length > 0 ? masked.fired.join('、') : '（无）'}`,
  )
  console.log(
    `      at-path 段落仍在：${AT_PATH_PARAGRAPH.test(masked.text) ? '是（改写未生效）' : '否（已移除）'}`,
  )

  // 3. Control: without masking it should be rejected. If it is not, the
  //    upstream check has changed and the plugin is masking for no reason.
  const control = await askOne(creds, systemText)
  const blocked = control.code === 11128
  report(
    '3. 对照（不打码，应为 400）',
    blocked,
    blocked
      ? `HTTP ${control.status} code=11128 —— 拦截仍在，打码是必需的`
      : `HTTP ${control.status} code=${control.code ?? '无'} —— 拦截已失效或判据变了，请复查插件是否还需要打码`,
  )

  return finish()
}

function finish() {
  const failed = results.filter((r) => !r.ok)
  console.log()
  if (failed.length > 0) {
    console.log(`FAIL: ${failed.length}/${results.length} 项未通过`)
    const first = failed[0]
    // The codes say different things and lead to different fixes, so they are
    // separated rather than lumped into "it is broken".
    if (first.detail?.includes('11102')) {
      console.log('  模型 id 不存在 —— 上游已不提供这个模型，换一个 id 试：')
      console.log('    node scripts/check-codebuddy.mjs --quick --model=<其他 id>')
    } else if (first.detail?.includes('11128')) {
      console.log('  打码后仍被拦 —— 上游指纹又变了。用 .tmp/cb-probe.cjs --syspara=0:11')
      console.log('  这种段落二分重新定位触发段落，再更新插件里的改写规则。')
    } else if (first.label.startsWith('2.')) {
      console.log('  真实提示被打回 —— 但最小请求通过，说明账号没问题，问题在内容或打码。')
    } else {
      console.log('  对照项异常 —— 上游可能已不再拦截该指纹，复查插件是否还需要打码。')
    }
    return 1
  }
  console.log(`OK: CodeBuddy 可用（${results.length}/${results.length} 项通过）`)
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
