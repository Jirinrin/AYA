import * as chalk from "chalk";
import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from "json-schema";

interface IFunctionData {
  paramNames: string[];
  hasOpts: boolean;
  paramsCount: number;
  paramStrings: boolean[];
}

export class ValidationError extends Error {}

export type CustomFunction = { (...args: any): any; paramNames?: string[]; };

export function getFunctionData(func: CustomFunction): IFunctionData {
  const funcStr = func.toString();
  const paramNames = func.paramNames ??
    ( funcStr.match(/\(([\w\s,{}=]*)\)/) ?? funcStr.match(/(\w*) *=>/) )[1] 
      .replace(/{[\w,\s]+}/g, '_opts')
      .split(/\s*,\s*/)
      .map(p => p.split('=')?.[0] ?? p)
      .map(p => p.trim())
      .filter(p => !!p);
  const hasOpts = paramNames[paramNames.length-1]?.endsWith('opts');
  const paramsCount = hasOpts ? paramNames.length-1 : paramNames.length;
  // Prefix string params with `s_` to allow passing them dry, or ask the gods to interpret it as a string
  const paramStrings = paramNames.map(p => p.includes('s_'));

  // console.info('func name', func.name);
  // console.info('func str', funcStr);
  // console.log('func length', func.length);
  // console.log('func params', paramNames);
  // console.log('func params count', paramsCount);
  // console.log('func opts', hasOpts);

  return { paramNames, hasOpts, paramsCount, paramStrings };
}

type SimpleType = number | string | boolean | null;

export function recordToSchema<T extends Record<string, SimpleType>>(
  r: T, types?: Partial<Record<keyof T, JSONSchema7TypeName>>,
): JSONSchema7 {
  return {
    type: 'object',
    properties: {
      ...Object.entries(r).reduce((acc, [k, v]) => ({
        ...acc,
        [k]: {
          type: types[k] ?? typeof v as JSONSchema7TypeName,
          default: v,
        }
      }), {} as Record<string, JSONSchema7Definition>)
    }
  };
}

export function getHashCode(s: string) {
  let hash = 0, i: number, chr: number;
  for (i = 0; i < s.length; i++) {
    chr   = s.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export function indent(indents: number): string {
  return '  '.repeat(indents);
}

const consolePairings: Partial<{[K in keyof Console]: [Console[K], chalk.Chalk]}> = {
  log: [console.log, chalk.green],
  warn: [console.warn, chalk.yellow],
  error: [console.error, chalk.redBright],
  info: [console.info, chalk.cyan],
  debug: [console.debug, chalk.gray],
  dir: [console.dir, chalk.magenta],
  table: [console.table, chalk.magentaBright],
}
const consolePairingsParsed: Array<[keyof Console, (indents: number) => Console['log']]> =
  Object.entries(consolePairings).map(([k, [consoleFunc, ch]]: [keyof Console, [Console['log'], chalk.Chalk]]) =>
    [k, (indents: number) => (...args: any[]) => consoleFunc(indent(indents) + ch(...args))]
  );

export function setConsole(indents: number = 0) {
  consolePairingsParsed.forEach(([k, getConsoleFunc]) => console[k] = getConsoleFunc(indents));
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
