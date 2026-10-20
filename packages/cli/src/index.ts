import { EventBus, isErr } from '@contra/core'
import { hasFlag, parseArgs } from './args.js'
import { type CliEvents, type Command, resolveCommand, runCommand } from './commands.js'
import { VERSION } from './version.js'

/** Entry point: parses argv, runs the resolved command, prints the result. */
export function main(argv: readonly string[]): number {
  const { flags, positionals } = parseArgs(argv)

  if (hasFlag(flags, 'version') || hasFlag(flags, 'v')) {
    process.stdout.write(`contra ${VERSION}\n`)
    return 0
  }

  const bus = new EventBus<CliEvents>()
  bus.on('message', (payload) => {
    process.stderr.write(`[${payload.level}] ${payload.text}\n`)
  })

  const command: Command = {
    name: resolveCommand(positionals[0]),
    args: positionals.slice(1),
  }

  const result = runCommand(command, VERSION, bus)
  if (isErr(result)) {
    process.stderr.write(`error: ${result.error}\n`)
    return 1
  }

  process.stdout.write(`${result.value}\n`)
  return 0
}

export { hasFlag, parseArgs, readFlag } from './args.js'
export {
  type CliEvents,
  type Command,
  type CommandName,
  type CommandResult,
  resolveCommand,
  runCommand,
} from './commands.js'
export { VERSION } from './version.js'