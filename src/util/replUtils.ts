import * as fs from 'fs';
import * as path from 'path';
import { REPLServer } from 'repl';
import { getFunctionData, ValidationError } from '.';
import { r } from '..';
import ENV from '../ENV';
import { highlightExps, ParamData } from './generalUtils';
import { config, IConfig } from './LocalStorage';
import { ActionFunction, ActionFunctionEvall, OperationFunction } from '../types';
import { CommandInfo } from '../modules';
import { setConsoleIndent } from './consoleExtension';

export const globalEval = eval;

const evalString = (str: string) => str.replace(/^["'`]?([^"'`]*)["'`]?$/, '$1');

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
            return arg.charAt(0).match(/["']/) ? evalString(arg) : globalEval(arg);
          return argData === ParamData.String ? evalString(arg) : globalEval(arg);
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
export function changeDirectory(s_dirPath: string): boolean {
  const newDirectory = resolvePath(s_dirPath);
  if (fs.existsSync(newDirectory)) {
    ENV.cwd = newDirectory;
    ENV.currentDirItems = fs.readdirSync(newDirectory);
    console.log(highlightExps`Current directory was set to "${newDirectory}"`);
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
