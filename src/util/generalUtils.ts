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
  const hasOpts = paramNames[paramNames.length-1]?.endsWith('opts') ?? false;
  const hasInfiniteParams = !!paramNames[paramNames.length-1]?.match(/^\.{3}\w+/);
  const paramsCount = hasOpts ? params.length-1 : params.length;
  const requiredParamsCount = requiredParams.length;

  // Prefix string params with `s_` to allow passing them dry, or ask the gods to interpret it as a string
  const paramData = paramNames.map(p => {
    if (p.startsWith('s_')) return ParamData.String;
    if (p.startsWith('ss_')) return ParamData.MaybeString;
    return ParamData.Any;
  });

  // console.info('data', { params, paramNames, hasOpts, hasInfiniteParams, paramsCount, requiredParamsCount, paramData });

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
export function escapeRegex(regexString: string): string {
  return regexString.replace(regexEscapeRegex, '\\$&');
}

/**
 * @return [body (not trimmed), opts]
 */
export function parseArgs(argsString: string, info?: CommandInfo): [args: string[], opts: Record<string, any>] {
  const opts = minimist(argsString.split(' '), {alias: info?.optsAliases});
  const args = opts._.join(' ').match(/"[^"]+"|'[^']+'|`[^`]+`|\/[^\/]+\/|[\S]+/g);
  delete opts._;

  return [args ?? [], opts];
}

export function splitArgsString(argsString: string): [reverse: boolean, part1: string, part2?: string] {
  const body = parseArgs(argsString)[0].join(' ');
  const bodyIndex = argsString.indexOf(body) ?? 0;
  const reverse = bodyIndex > 3;
  const splitIndex = reverse ? bodyIndex : body.length;
  return [reverse, argsString.slice(0, splitIndex), argsString.slice(splitIndex)];
}
