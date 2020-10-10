import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from "json-schema";

interface IFunctionData {
  hasOpts: boolean;
  paramsCount: number;
  paramStrings: boolean[];
}

export class ValidationError extends Error {}

export function getFunctionData(func: Function): IFunctionData {
  const funcStr = func.toString();
  const paramNames = ( funcStr.match(/\(([\w\s,{}=]*)\)/) ?? funcStr.match(/(\w*) *=>/) )[1] 
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

  return { hasOpts, paramsCount, paramStrings };
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
