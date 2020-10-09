import * as fs from 'fs';
import * as path from 'path';
import { FileIteratorCallback } from './types';
import ENV from './ENV';
import C from './CONST';
import { putMusicMetadataOnEntity } from './modules/Music';
import { putImageMetadataOnEntity } from './modules/Image';
import { REPLServer } from 'repl';

export const globalEval = eval;
export function evall(func: Function, r: REPLServer) {
  return (args: string) => {
    try {
      const argsArray = 
        args
          .split(',,')
          .map(arg => globalEval(arg));
      func(...argsArray);
      r.clearBufferedCommand(); // Doesn't seem to do much
    } catch (err) {
      console.error('An error occurred:', err);
    }
  };
}

export function setEnvVar<K extends keyof typeof ENV>(key: K, value: typeof ENV[K]) {
  ENV[key] = value;
}

/**
 * @return boolean indicating whether it was succesful
 */
export function changeDirectory(newFolderName: string): boolean {
  if (fs.existsSync(newFolderName)) {
    setEnvVar('folder', newFolderName);
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
  depth: number = ENV.recursionDepth,
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

  if (depth === ENV.recursionDepth)
    console.info('Recursive action done!');
}

export function getEnts(folder: string): fs.Dirent[] {
  return fs.readdirSync(folder, { withFileTypes: true });
}
