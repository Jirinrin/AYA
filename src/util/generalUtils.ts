import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from "json-schema";
import { detect } from 'encoding-japanese';
import { ModuleKind, transpileModule } from "typescript";
import { CommandInfo } from "../modules";
import { DirentWithMetadata, IMetadataFilterOpts } from "../types";
import minimist from "./minimistStringBody";
import { highlight } from "./replCustomization";
import { readFileSync, readJsonSync, writeFileSync, writeJsonSync } from "fs-extra";
import * as chalk from "chalk";
import { config } from "./LocalStorage";
import ENV from "../ENV";
import { cwdRel } from "./fsUtils";

export enum ParamData {
  Any,
  String,
  MaybeString,
  RegexOrString,
}
// todo: use this data in syntax highlighting or sth?

interface IFunctionData {
  paramNames: string[];
  hasOpts: boolean;
  hasInfiniteParams: boolean;
  paramsCount: number;
  requiredParamsCount: number;
  paramData: ParamData[];
}

export class ValidationError extends Error {}

export type CustomFunction = { (...args: any): any; paramNames?: string[]; };

export function getFunctionData(func: CustomFunction): IFunctionData {
  const funcStr = func.toString();
  const params = func.paramNames ??
    ( funcStr.match(/\(([\w\s,{}=\.]*)\)/) ?? funcStr.match(/(\w*) *=>/) )[1] 
      .replace(/{[\w,\s]+}/g, '_opts')
      .split(/\s*,\s*/)
      .map(p => p.trim())
      .filter(p => !!p);
  const paramNames = params.map(p => p.match(/(\w+) *=/)?.[0] ?? p);
  const requiredParams = params.filter(p => !p.includes('=') && !p.includes('opts'));
  const hasOpts = paramNames[paramNames.length-1]?.includes('opts') ?? false;
  const hasInfiniteParams = !!paramNames[paramNames.length-1]?.match(/^\.{3}\w+/);
  const paramsCount = hasOpts ? params.length-1 : params.length;
  const requiredParamsCount = requiredParams.length;

  // Prefix string params with `s_` to allow passing them dry, or ask the gods to interpret it as a string
  const paramData = paramNames.map(p => {
    if (p.startsWith('s_')) return ParamData.String;
    if (p.startsWith('ss_')) return ParamData.MaybeString;
    if (p.startsWith('r_')) return ParamData.RegexOrString;
    return ParamData.Any;
  });

  // if (funcStr.includes('renameCallback'))
  //   console.info('data', { params, paramNames, hasOpts, hasInfiniteParams, paramsCount, requiredParamsCount, paramData });

  return { paramNames, hasOpts, hasInfiniteParams, paramsCount, requiredParamsCount, paramData };
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

const regexEscapeRegex = /[-\/\\^$*+?.()|[\]{}]/g
// todo: could replace this by lodash' escapeRegExp right?
export function escapeRegex(regexString: string): string {
  return regexString.replace(regexEscapeRegex, '\\$&');
}

// It is assumed that you don't put two spaces after one another and don't have leading/trailing spaces.
// Special case: for regexes it allows extra flags behind it and needs to be merged with an options param in front of it if present
// todo: possibly simplify this with backreferencing?
// todo: unit test the functioning of this regex
const argsSplitRegex1 = /(?:"[^"]*"?|'[^']*'?|r?`[^`]*`?|(?:--\w+=)?\/[^\/]+(?:\/[igmus]*)?|[^\s`"'\/]+)(?:\s*|[^`"'\/]*)/g; // => split by 'contained strings' etc / spaces

/**
 * @return [body (not trimmed), opts]
 */
export function parseArgs(argsString: string, info?: CommandInfo): [args: string[], opts: Record<string, any>] {
  const preSplit = argsString.match(argsSplitRegex1) ?? [];
  const rawOpts = minimist(preSplit, {alias: info?.optsAliases, boolean: info?.boolOptsPadded});

  const args = rawOpts._; // todo: test if should not be `rawOpts._.join('').match(argsSplitRegex1) ?? []`

  const opts = Object.fromEntries( Object.entries(rawOpts).map(([k,v]) => [ k.trim(), (typeof v === 'string') ? v.trim() : v ]) );
  info?.boolOpts?.forEach(optName => opts[optName] = rawOpts[optName] || rawOpts[optName+' ']);
  delete opts._;

  return [args, opts];
}

export function splitArgsString(argsString: string, info: CommandInfo): [reverse: boolean, part1: string, part2?: string] {
  const body = parseArgs(argsString, info)[0].join('');
  const bodyIndex = argsString.indexOf(body) ?? 0;
  const reverse = bodyIndex > 2;
  const splitIndex = reverse ? bodyIndex : body.length;
  return [reverse, argsString.slice(0, splitIndex), argsString.slice(splitIndex)];
}

export function formatMsg(verbose: boolean, ...message: any[]): string {
  const toStr = (m: any) => (verbose ? JSON.stringify(m, null, 2) : JSON.stringify(m));
  return message
    .map(m => {
      if (typeof m === 'string') return (verbose ? toStr(m) : m);
      if (typeof m === 'undefined') return 'undefined';
      if (typeof m === 'function') return 'Function ' + m.toString();
      if (m instanceof Error) return '' + m;
      return highlight( toStr(m)?.replace(/^"?(.*)"?$/, '$1').replace(/\\([^\\])/g, '$1') ?? '', 'json' );
    })
    .join(' ');
}

export function verbose(msg: any) {
  return formatMsg(true, msg);
}

/** Util function to check if an entity applies for a given operation */
export function checkFilter(ent: DirentWithMetadata, { filter }: IMetadataFilterOpts): boolean {
  if (!filter)
    return true;
  const em = !config.s.exifMetadata  || ENV.noMetadata || !!ent.em;
  const mm = !config.s.musicMetadata || ENV.noMetadata || !!ent.mm;

  if (filter.startsWith('/'))
    return !!ent.nameBase.match(eval(filter));
  if (filter.startsWith('.'))
    return !!ent.ext.match(new RegExp(`^${filter.slice(1)}$`));

  switch (filter) {
    case 'file': return ent.isFile();
    case 'directory': return ent.isDirectory();
    case 'musicFiles': return !!((mm || em) && ent.ext.match(/mp3|m4a|ogg|flac|wav|wma|aac/i));
    case 'imageFiles': return !!(em && ent.ext.match(/jpg|png|gif|jfif|exif|bmp|webp/i));
    case 'videoFiles': return !!(em && ent.ext.match(/mp4|mov|wmv|flv|avi|webm|mkv|vob|avi|wmv|mpg|m4v/i));
    default:
      console.warn('Unknown filter:', filter);
      return true;
  }
}

export function readJson<T extends any = any>(filePath: string): T {
  if (!filePath.includes('.'))
    filePath += '.json';

  return readJsonSync(filePath, {encoding: 'utf8'});
}
export function writeJson(filePath: string, data: any, log = true): void {
  if (!filePath.includes('.'))
    filePath += '.json';

  writeJsonSync(filePath, data, {encoding: 'utf8', spaces: 2})
  if (log)
    console.log(highlightExp`Successfully wrote data to ${cwdRel(filePath)}`);
}
export function readFile(filePath: string, encoding = 'utf8'): string {
  if (encoding === 'auto') {
    const det = detect(readFileSync(filePath));
    switch (det) {
      case 'SJIS':
        // return convert(bf, {to: 'UTF8', from: 'SJIS', type: 'string'});
        encoding = 'latin1'; break;
      case 'UNICODE':
        encoding = 'latin1'; break;
      case false:
        break;
      default:
        encoding = det.toLowerCase();
    }
  }
  return readFileSync(filePath, {encoding});
}
export function writeFile(filePath: string, data: any, opts: {log?: boolean, encoding?: string} = {}): void {
  if (!filePath.includes('.'))
    filePath += '.txt';

  writeFileSync(filePath, data, opts.encoding ?? 'utf8');
  if (opts.log !== false)
    console.log(highlightExp`Successfully wrote data to ${cwdRel(filePath)}`);
}

function highlightExpsForCh(ch: chalk.Chalk, strings: TemplateStringsArray, ...exps: (string|number)[]) {
  const highlightedExps = exps.map(e => ch(e));
  return strings.reduce((acc, s, i) => acc + s + (highlightedExps[i] ?? ''), '');
}

type TemplateTagStringFunction = (strings: TemplateStringsArray, ...exps: (string|number)[]) => string;

export const highlightExp: TemplateTagStringFunction = (strings, ...exps) =>
  highlightExpsForCh(chalk.blue, strings, ...exps);

export const highlightExpsC = (ch: chalk.Chalk): TemplateTagStringFunction => (strings, ...exps) =>
  highlightExpsForCh(ch, strings, ...exps);

// todo: extra functions to mainly highlight the base path or mainly highlight the dir path

export function matchString(str: string): RegExpMatchArray|null {
  return str.match(/^(")([^"]+)("?)/) ?? str.match(/^(')([^']+)('?)/) ?? str.match(/^(`)([^`]+)(`?)/);
}

export function parseStringAsRaw(str: string) {
  return str.replace(/\\/g, '\\\\');
}

export function evalRawStrings(str: string) {
  if (str.indexOf('r`') !== -1) {
    // todo: somehow don't do this if r`...` is part of another string
    let rawStrs = str.match(/(\W|^)r`[^`]*`/g);
    if (rawStrs.length) {
      return rawStrs.reduce((accStr, rs) => {
        const rStart = rs.startsWith('r');
        return accStr.replace(rs, (rStart ? '' : rs.charAt(0)) + parseStringAsRaw(rs.slice(rStart ? 1 : 2)))
      }, str);
    }
  }
  return str;
}

export function transformTs(typescriptCode: string): string {
  return transpileModule(typescriptCode, { compilerOptions: { module: ModuleKind.ES2020 }}).outputText;
}
