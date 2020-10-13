import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from "json-schema";
import minimist = require('minimist');
import { CommandInfo } from "../modules";

export enum ParamData {
  Any,
  String,
  MaybeString,
}
// todo: use this data in syntax highlighting or sth?

interface IFunctionData {
  paramNames: string[];
  hasOpts: boolean;
  hasInfiniteParams: boolean;
  paramsCount: number;
  paramData: ParamData[];
}

export class ValidationError extends Error {}

export type CustomFunction = { (...args: any): any; paramNames?: string[]; };

export function getFunctionData(func: CustomFunction): IFunctionData {
  const funcStr = func.toString();
  const paramNames = func.paramNames ??
    ( funcStr.match(/\(([\w\s,{}=\.]*)\)/) ?? funcStr.match(/(\w*) *=>/) )[1] 
      .replace(/{[\w,\s]+}/g, '_opts')
      .split(/\s*,\s*/)
      .map(p => p.split('=')?.[0] ?? p)
      .map(p => p.trim())
      .filter(p => !!p);
  const hasOpts = paramNames[paramNames.length-1]?.endsWith('opts') ?? false;
  const hasInfiniteParams = !!paramNames[paramNames.length-1]?.match(/^\.{3}\w+/);
  const paramsCount = hasOpts ? paramNames.length-1 : paramNames.length;

  // Prefix string params with `s_` to allow passing them dry, or ask the gods to interpret it as a string
  const paramData = paramNames.map(p => {
    if (p.startsWith('s_')) return ParamData.String;
    if (p.startsWith('ss_')) return ParamData.MaybeString;
    return ParamData.Any;
  });

  // console.info('func name', func.name);
  // console.info('func str', funcStr);
  // console.log('func length', func.length);
  // console.log('func params', paramNames);
  // console.log('func params count', paramsCount);
  // console.log('func opts', hasOpts);

  return { paramNames, hasOpts, hasInfiniteParams, paramsCount, paramData };
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
export function escapeRegex(regexString: string): string {
  return regexString.replace(regexEscapeRegex, '\\$&');
}

/**
 * @return [body (not trimmed), opts]
 */
export function parseArgs(argsString: string, info?: CommandInfo): [body: string, opts: Record<string, any>] {
  const opts: Record<string, any> & minimist.ParsedArgs = minimist(argsString.split(' '), {alias: info?.optsAliases});
  const body = opts._.join(' ');
  delete opts._;

  return [body, opts];
}

export function splitArgsString(argsString: string): [reverse: boolean, part1: string, part2?: string] {
  const [body] = parseArgs(argsString);
  const bodyIndex = argsString.indexOf(body) ?? 0;
  const reverse = bodyIndex > 3;
  const splitIndex = reverse ? bodyIndex : body.length;
  return [reverse, argsString.slice(0, splitIndex), argsString.slice(splitIndex)];
}
