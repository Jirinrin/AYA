import * as fs from 'fs';
import { REPLServer } from 'repl';
import { forEveryEntry, getFunctionData, ValidationError } from '.';
import { r } from '..';
import ENV from '../ENV';
import { ParamData } from './generalUtils';
import { config, IConfig } from './LocalStorage';
import { ActionFunction, ActionFunctionEvall, OperationFunction } from '../types';
import { CommandInfo } from '../modules';
import { setConsoleIndent } from './consoleExtension';

export const globalEval = eval;

/**
 * Generates from a function you give it a wonderful command with argument parsing etc.
 */
export function evall(func: OperationFunction, info: CommandInfo): ActionFunctionEvall {
  let { paramsCount, paramData } = getFunctionData(func);

  return async (body, opts = {}): Promise<void> => {
    try {
      setConsoleIndent(0);

      if (paramsCount > 0 && !body)
        throw new ValidationError(`This command requires ${paramsCount} argument${paramsCount > 1 ? 's' : ''}`);

      let argsArray: string[];
      if (paramsCount == 0) {
        argsArray = [];
      } else if (paramsCount == 1) {
        argsArray = [body];
      } else {
        const partsMatch = body.match(/"[^"]+"|'[^']+'|`[^`]+`|\/[^\/]+\/|[\S]+/g);
        if (partsMatch.length < paramsCount)
          throw new ValidationError(`This command requires ${paramsCount} arguments instead of ${partsMatch.length}`);
        argsArray = [...partsMatch.slice(0,paramsCount-1), partsMatch.slice(paramsCount-1).join(' ')];
      }
      
      const parsedArgsArray = argsArray.map((arg: string, i) => {
        const argData = paramData[i];
        try {
          return argData === ParamData.String ? arg : globalEval(arg)
        } catch (err) {
          if (argData === ParamData.MaybeString)
            return arg;
          // It will parse simple string arguments without spaces without having to prefix `s_`
          if (err instanceof ReferenceError && err.message === `${arg} is not defined`)
            return arg;
          throw err;
        }
      });

      if (opts)
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

// evall-simple
export function evalls(func: ActionFunction): ActionFunction {
  return async (args) => {
    await func(args);
    r.write('\n');
  };
}

/**
 * @return boolean indicating whether it was succesful
 */
export function changeDirectory(newFolderName: string): boolean {
  if (fs.existsSync(newFolderName)) {
    ENV.cwd = newFolderName;
    console.log(`The current directory is now "${newFolderName}"`);
    return true;
  } else {
    console.error('Provided folder name appears to be invalid. Please try again');
    return false;
  }
}

export function getCommandHelp(r: REPLServer, commandName: string) {
  const command = r.commands[commandName];
  if (command)
    console.log(`Explanation for .${commandName}:\n  ${command.help}`);
  else
    console.error(`Could not find a command named "${commandName}"`);
}

export function setConfigItem<K extends keyof IConfig>(key: K, val: IConfig[K]) {
  if (config.set(key, val))
    console.info(`Successfully set config item "${key}" to ${val}`);
}

export function ls() {
  return forEveryEntry(ENV.cwd, e => {
    if (e.isDirectory()) e.name += '/';
    console.log(e.name);
  });
}
