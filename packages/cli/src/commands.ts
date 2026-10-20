import { EventBus, ok, type Result } from '@contra/core'

/** The command surface the CLI exposes. */
export type CommandName = 'version' | 'doctor' | 'help'

/** A command outcome, reported as a Result so failures are explicit. */
export type CommandResult = Result<string, string>

/** The event map used by the CLI to report progress. */
export interface CliEvents {
  command: { name: CommandName }
  message: { level: 'info' | 'warn'; text: string }
}

/** A parsed command invocation. */
export interface Command {
  readonly name: CommandName
  readonly args: readonly string[]
}

/** Resolves a raw command name, defaulting to "help" for unknown input. */
export function resolveCommand(raw: string | undefined): CommandName {
  switch (raw) {
    case 'version':
    case 'doctor':
    case 'help':
      return raw
    default:
      return 'help'
  }
}

/**
 * Runs a command and returns its output. The bus is used to surface progress
 * messages so the transport layer stays decoupled from the command logic.
 */
export function runCommand(
  command: Command,
  version: string,
  bus: EventBus<CliEvents> = new EventBus<CliEvents>(),
): CommandResult {
  bus.emit('command', { name: command.name })

  switch (command.name) {
    case 'version': {
      const output = `contra ${version}`
      bus.emit('message', { level: 'info', text: output })
      return ok(output)
    }
    case 'doctor': {
      const report = ['contra doctor', `node: ${process.version}`, 'workspace: pnpm'].join('\n')
      bus.emit('message', { level: 'info', text: 'checks complete' })
      return ok(report)
    }
    case 'help': {
      const usage = [
        'contra <command>',
        '',
        'Commands:',
        '  version   Print the CLI version',
        '  doctor   Print environment diagnostics',
        '  help      Show this message',
      ].join('\n')
      return ok(usage)
    }
  }
}
