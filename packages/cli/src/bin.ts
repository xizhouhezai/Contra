#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { main } from './index.js'

/**
 * Detects whether this module is the process entry point, so importing the
 * library never triggers a command run.
 */
function isEntryPoint(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  return import.meta.url === pathToFileURL(entry).href
}

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2))
}
