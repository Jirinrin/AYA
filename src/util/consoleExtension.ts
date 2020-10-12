import * as chalk from "chalk";
import {logger, Logger, PersistentLogger, pLogger } from "./LocalStorage";
import { highlight } from "./replCustomization";

declare global {
  interface Console {
    llogv: Logger['logv'];
    llog: Logger['log'];
    llogl: Logger['logl'];
    plog: PersistentLogger['log'];
    // extra colors
    logPurple: Console['log'];
    logPink: Console['log'];
    // verbose with json syntax highlighting
    logv: Console['log'];
  }
}

console.llog = logger.log;
console.llogv = logger.logv;
console.llogl = logger.logl;
console.plog = pLogger.log;

export function indent(indents: number): string {
  return '  '.repeat(indents);
}

export function getTrace() {
  const err = { name: ' ' };
  Error.captureStackTrace(err, getTrace);
  return (err as Error).stack.trim().slice(1);
}

export function formatMsg(verbose: boolean, ...message: any[]): string {
  const toStr = (m: any) => (verbose ? JSON.stringify(m, null, 2) : JSON.stringify(m));
  return message
    .map(m => typeof m === 'string' 
      ? (verbose ? toStr(m) : m)
      : highlight( toStr(m)?.replace(/^"?(.*)"?$/, '$1').replace(/\\([^\\])/g, '$1'), 'json' )
    )
    .join(' ') + (verbose ? '\n' : '');
}

type ConsolePairing<K extends keyof Console = any> = [log: Console[K], ch: chalk.Chalk, verbose?: boolean];
const consolePairings: Partial<{[K in keyof Console]: ConsolePairing<K>}> = {
  log: [console.log, chalk.green],
  warn: [console.warn, chalk.yellow],
  error: [console.error, chalk.redBright],
  info: [console.info, chalk.cyan],
  debug: [console.debug, chalk.gray],
  dir: [console.dir, chalk.magenta],
  table: [console.table, chalk.magentaBright],
  logPurple: [console.log, chalk.magenta],
  logPink: [console.log, chalk.magentaBright],
  logv: [console.log, chalk.green, true],
}
const consolePairingsParsed: Array<[k: keyof Console, getConsoleFn: (indents: number) => Console['log']]> =
  Object.entries(consolePairings).map(([k, [consoleFn, ch, v]]: [keyof Console, ConsolePairing]) =>
    [k, (indents: number) => (...args: any[]) => consoleFn(indent(indents) + ch(formatMsg(v ?? false, ...args)))]
  );

export function setConsole(indents: number = 0) {
  consolePairingsParsed.forEach(([k, getConsoleFn]) => console[k] = getConsoleFn(indents));
}

let currentIndents = 0;
export function setConsoleIndentRel(indentsDiff: number) {
  currentIndents = Math.max(currentIndents + indentsDiff, 0);
  setConsole(currentIndents);
  return currentIndents;
}
export function setConsoleIndent(indents: number) {
  if (currentIndents === indents) return;
  currentIndents = indents;
  setConsole(currentIndents);
}
