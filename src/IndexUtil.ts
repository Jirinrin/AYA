import * as fs from 'fs';
import * as path from 'path';
import { FileIteratorCallback } from './types';
import ENV from './ENV';
import C from './CONST';
import { putMusicMetadataOnEntity } from './modules/Music';
import { putImageMetadataOnEntity } from './modules/Image';
import { REPLServer } from 'repl';

export function setEnvVar<K extends keyof typeof ENV>(key: K, value: typeof ENV[K]) {
  ENV[key] = value;
}

export function changeDirectory(newFolderName: string) {
  if (fs.existsSync(newFolderName)) {
    setEnvVar('folder', newFolderName);
  } else {
    console.error('provided folder name appears to be invalid');
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
export function forEveryEntry(folder: string, callback: FileIteratorCallback) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  fs.readdir(folder, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error(err);
    }
    files.forEach(async (ent) => {
      if (C.musicMetadata) {
        ent = await putMusicMetadataOnEntity(folder, ent);
      }
      if (C.imageMetadata) {
        ent = await putImageMetadataOnEntity(folder, ent);
      }
      callback(folder, ent);
    });
  });
}

export function forEveryEntryDeep(
  folder: string, 
  callback: FileIteratorCallback,
  depth: number = ENV.recursionDepth,
) {
  forEveryEntry(folder, (deepFolder, ent) => {
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
}
