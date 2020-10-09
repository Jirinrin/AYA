import * as fs from 'fs';
import * as path from 'path';
import { REPLServer } from 'repl';
import minimist from 'minimist';

import { FileIteratorCallback } from './types';
import C from './CONST';
import { putMusicMetadataOnEntity } from './modules/Music';
import { putImageMetadataOnEntity } from './modules/Image';
import { config } from './LocalStorage';
import ENV from './ENV';

interface IFunctionData {
  hasOpts: boolean;
  paramsCount: number;
  paramStrings: boolean[];
}

class ValidationError extends Error {}

function getFunctionData(func: Function): IFunctionData {
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

export const globalEval = eval;
export function evall(func: Function, r: REPLServer) {
  const { hasOpts, paramsCount, paramStrings } = getFunctionData(func);

  return (args: string) => {
    try {
      let body = args.trim();
      let opts: Record<string, any>;

      const optionsStartIndex = args.indexOf('--');
      if (optionsStartIndex > -1) {
        if (!hasOpts)
          throw new ValidationError('You are passing options, but this command is not expecting any');

        body = args.substring(0, optionsStartIndex);
        opts = minimist( args.slice(optionsStartIndex).split(' '));
        // console.log('options', Object.entries(opts).map(e => `${e[0]}::${e[1]}`).join('|||'));
      }

      if (paramsCount > 0 && !body)
        throw new ValidationError(`Please supply ${paramsCount} argument${paramsCount > 1 ? 's' : ''}`);

      let argsArray: string[];
      if (paramsCount == 0) {
        argsArray = [];
      } else if (paramsCount == 1) {
        argsArray = [body];
      } else if (paramsCount == 2) {
        // for now only up to 2 params supported
        const partsMatch = body.match(/^\s*(\S+) +(\S.*)$/);
        if (partsMatch.length-1 !== paramsCount)
          throw new ValidationError(`You should supply ${paramsCount} arguments instead of ${partsMatch.length-1}`);
        argsArray = [partsMatch[1], partsMatch[2]];
      }
      
      const parsedArgsArray = argsArray.map((arg: string, i) => {
        try {
          return paramStrings[i] ? arg : globalEval(arg)
        } catch (err) {
          // It will parse simple string arguments without spaces without having to prefix `s_`
          if (err instanceof ReferenceError && err.message === `${arg} is not defined`)
            return arg;
          throw err;
        }
      });

      if (opts)
        parsedArgsArray.push(opts);

      func(...parsedArgsArray);
      r.clearBufferedCommand(); // Doesn't seem to do much
    } catch (err) {
      if (err instanceof ValidationError)
        console.error(err);
      else
        console.error('An error occured:', (err as Error).stack);
    }
  };
}

/**
 * @return boolean indicating whether it was succesful
 */
export function changeDirectory(newFolderName: string): boolean {
  if (fs.existsSync(newFolderName)) {
    ENV.folder = newFolderName;
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

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export function forEveryEntryAsync(folder: string, callback: FileIteratorCallback) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  fs.readdir(folder, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }
    files?.forEach(async (ent) => {
      if (C.musicMetadata) ent = await putMusicMetadataOnEntity(folder, ent);
      if (C.imageMetadata) ent = await putImageMetadataOnEntity(folder, ent);
      callback(folder, ent);
    });
  });
}

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export async function forEveryEntry(folder: string, callback: FileIteratorCallback) {
  console.info(`Scanning ${folder}...`);
  try {
    if (typeof callback !== 'function')
      throw new Error('callback does not appear to be a function');

    const files = getEnts(folder);
    await Promise.all(
      files?.map(async (ent) => {
        if (C.musicMetadata) ent = await putMusicMetadataOnEntity(folder, ent);
        if (C.imageMetadata) ent = await putImageMetadataOnEntity(folder, ent);
        try { 
          callback(folder, ent);
        } catch (err) { 
          console.error(err);
        }
      })
    );

  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    console.info('Done!');
  }
}

export async function forEveryEntryDeep(
  folder: string, 
  callback: FileIteratorCallback,
  depth: number = config.s.recursionDepth,
) {
  await forEveryEntry(folder, (deepFolder, ent) => {
    callback(deepFolder, ent);
    if (depth <= 0) {
      return;
    }
    if (ent.isDirectory()) {
      return forEveryEntryDeep(
        path.join(deepFolder, ent.name),
        callback,
        depth - 1,
      );
    }
  });

  if (depth === config.s.recursionDepth)
    console.info('Recursive action done!');
}

export function getEnts(folder: string): fs.Dirent[] {
  return fs.readdirSync(folder, { withFileTypes: true });
}
