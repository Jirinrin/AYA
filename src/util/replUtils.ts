import * as fs from 'fs';
import * as path from 'path';
import { REPLServer } from 'repl';
import { getFunctionData, ValidationError } from '.';
import { r } from '..';
import ENV from '../ENV';
import { evalRawStrings, highlightExp, matchString, ParamData, parseStringAsRaw, transformTs } from './generalUtils';
import { config, IConfig } from './LocalStorage';
import { ActionFunctionEvall, OperationFunction } from '../types';
import { CommandInfo } from '../modules';
import { setConsoleIndent } from './consoleExtension';

export const globalEval = eval;

const evalString = (str: string) => {
  return str.match(/^(?:".*"|'.*'|`.*`)$/)
    ? globalEval(str)
    : str;
};

/**
 * Generates from a function you give it a wonderful command with argument parsing etc.
 */
export function evall(func: OperationFunction, info?: CommandInfo): ActionFunctionEvall {
  let { paramsCount, requiredParamsCount, paramData, hasInfiniteParams } = getFunctionData(func);

  return async (rawArgs, opts): Promise<void> => {
    try {
      setConsoleIndent(0);

      // console.log('eval', opts, paramsCount, requiredParamsCount, paramData, hasInfiniteParams);

      if (rawArgs.length < requiredParamsCount)
        throw new ValidationError(`This command requires at least ${requiredParamsCount} argument${requiredParamsCount > 1 ? 's' : ''}`);

      let argsArray = hasInfiniteParams
        ? rawArgs.map(a => a.trim())
        : paramsCount < 1
          ? []
          : paramsCount < 2
            ? [rawArgs?.join('')]
            : [...rawArgs.slice(0,paramsCount-1).map(a => a.trim()), rawArgs.slice(paramsCount-1).join('')];

      const parsedArgsArray = argsArray.map((arg: string, i) => {
        const argData = paramData[i];
        try {
          if (argData === ParamData.RegexOrString)
            return matchString(arg) ? evalString(parseStringAsRaw(arg)) : globalEval(evalRawStrings(arg));
          return argData === ParamData.String ? evalString(parseStringAsRaw(arg)) : globalEval(evalRawStrings(arg));
        } catch (err) {
          if (argData === ParamData.MaybeString || argData === ParamData.RegexOrString)
            return arg;
          // It will parse simple string arguments without spaces without having to prefix `s_`
          if (err instanceof ReferenceError && err.message === `${arg} is not defined`)
            return arg;
          throw err;
        }
      });

      if (!hasInfiniteParams)
        parsedArgsArray.push(opts);

      await func(...parsedArgsArray);

      r.clearBufferedCommand(); // Doesn't seem to do much
    } catch (err) {
      if (err instanceof ValidationError)
        console.error(err);
      else
        console.error('An error occured:', (err as Error).stack);
    } finally {
      setConsoleIndent(0);
      r.write('\n');
    }
  };
}

/**
 * @return boolean indicating whether it was succesful
 */
export function changeDirectory(dirPath: string, relative?: boolean): boolean {
  const newDirectory = resolvePath(dirPath);
  if (fs.existsSync(newDirectory)) {
    const printedDir = relative ? path.relative(ENV.cwd, newDirectory) : newDirectory;
    ENV.cwd = newDirectory;
    ENV.currentDirItems = fs.readdirSync(newDirectory);
    console.log(highlightExp`Current directory was set to "${printedDir}"`);
    return true;
  } else {
    console.error('Provided folder name appears to be invalid. Please try again');
    return false;
  }
}

export function resolvePath(relOrAbsPath: string): string {
  return path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.resolve(ENV.cwd ?? '', relOrAbsPath);
}

export function wrapResolvePath1<T extends (path: string, ...args: any[]) => any>(fn: T): T {
  return ( (path, ...args) => fn(resolvePath(path), ...args) ) as T;
}
export function wrapResolvePath1Folder<T extends (folderPath: string, ...args: any[]) => any>(fn: T): T {
  return ( (folderPath, ...args) => fn(resolvePath(folderPath ?? '.'), ...args) ) as T;
}
export function wrapResolvePath2<T extends (p1: string, p2: string, ...args: any[]) => any>(fn: T): T {
  return ( (p1, p2, ...args) => fn(resolvePath(p1), resolvePath(p2), ...args) ) as T;
}

export function getCommandHelp(r: REPLServer, commandName: string) {
  const command = r.commands[commandName];
  if (command)
    console.log(`Explanation for .${commandName}:\n  ${command.help}`);
  else
    console.error(`Could not find a command named "${commandName}"`);
}

export function setConfigItem<K extends keyof IConfig>(key: K, ss_val: IConfig[K]) {
  if (config.set(key, ss_val))
    console.info(`Successfully set config item "${key}" to ${ss_val}`);
}

export function loadScript(s_file: string, log = false) {
  if (log)
    console.log('Loading script:', s_file);
  const filePath = ENV.extraScriptsDirItems.includes(s_file)
    ? path.join(config.s.extraScriptsDir, s_file)
    : resolvePath(s_file);
  if (!fs.existsSync(filePath)) {
    console.debug('Script not loaded (file does not exist):', filePath);
    return;
  }
  const contents = fs.readFileSync(filePath).toString();
  return loadCoad(contents, log);
}

export function loadCoad(code: string, log = false) {
  const globalKeysBeforeLoad = new Set(log ? Object.keys(global) : []);
  try {
    return globalEval(transformTs(code));
  } finally {
    if (!log) return;
    const globalsAdded = Object.keys(global).filter(k => !globalKeysBeforeLoad.has(k))
    if (globalsAdded.length)
      console.log('Globals added:', globalsAdded);
    // todo: somehow also find which keys were overwritten / which were actually changed
  }
}
