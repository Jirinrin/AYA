import * as chalk from "chalk";
import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from "json-schema";

export enum ParamData {
  Any,
  String,
  MaybeString,
}
// todo: use this data in syntax highlighting or sth?

interface IFunctionData {
  paramNames: string[];
  hasOpts: boolean;
  paramsCount: number;
  paramData: ParamData[];
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
  const hasOpts = paramNames[paramNames.length-1]?.endsWith('opts') ?? false;
  const paramsCount = hasOpts ? paramNames.length-1 : paramNames.length;
  // Prefix string params with `s_` to allow passing them dry, or ask the gods to interpret it as a string
  const paramData = paramNames.map(p => {
    if (p.includes('s_')) return ParamData.String;
    if (p.includes('r_')) return ParamData.MaybeString;
    return ParamData.Any;
  });

  // console.info('func name', func.name);
  // console.info('func str', funcStr);
  // console.log('func length', func.length);
  // console.log('func params', paramNames);
  // console.log('func params count', paramsCount);
  // console.log('func opts', hasOpts);

  return { paramNames, hasOpts, paramsCount, paramData };
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
