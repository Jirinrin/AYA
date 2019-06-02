import { renameFile, splitFileName } from './Util';
import ENV from '../ENV';
import { RawFactoryModule, FileIteratorFunction } from '../types';

export type EntityType = 'file' | 'directory';
interface RenameOptions {
  skipEntType?: EntityType;
  skipExt?: boolean;
  musicFiles?: boolean; // Only rename music files, exposing metadata of the files
}

const module: RawFactoryModule = {
  everyEntryRename: (iterator: FileIteratorFunction) => ({
    abbrev: 'eer',
    help: 'Rename every entry in folder using {$1: (fileName: string, metadata?) => string}. You may supply {$2: {skipEntType: "file"|"directory", skipExt: boolean, musicFiles: boolean}}',
    run: (
      renameCallback: (fileName: string, metadata?: Object) => string, 
      {skipEntType, skipExt, musicFiles}: RenameOptions = {}
    ) => {
      iterator(ENV.folder, (folder, ent) => {
        let metadata: any = {};
        if (musicFiles) {
          metadata.mm = (ent as any).mm;
          if (!metadata.mm) {
            return;
          }
        }

        let newName: string;
        try {
          if (skipExt) {
            const [baseName, ext] = splitFileName(ent.name);
            newName = renameCallback(baseName, metadata) + ext;
          } else {
            newName = renameCallback(ent.name, metadata);
          }
        } catch {
          return;
        }

        if (
          ent.name !== newName && 
          !(ent.isDirectory() && skipEntType === 'directory') && 
          !(ent.isFile() && skipEntType === 'file')
        ) {
          console.log(`Renaming ${ent.name} to ${newName}`);
          renameFile(folder, ent.name, newName);
        }
      });
    }
  }),

  everyEntryHasToMatch: (iterator: FileIteratorFunction) => ({
    abbrev: 'eehtm',
    help: 'for every entry in folder rename to {$2: string} if it matches {$1: regex}',
    /**
     * @param exp: thing to try to match
     * @param put: thing to put before the fileName
     */
    run: (exp: RegExp, put: string) => {
      iterator(ENV.folder, (folder, ent) => {
        if (!ent.name.toLowerCase().match(exp)) {
          renameFile(folder, ent.name, `${put} - ${ent}`);
        }
      });
    }
  }),

  everyEntryHasToInclude: (iterator: FileIteratorFunction) => ({
    abbrev: 'eehti',
    help: 'for every entry in folder rename if it includes {$1: string} you provide',
    /**
     * @param part: thing that every filename has to include
     */
    run: (part: string) => {
      iterator(ENV.folder, (folder, ent) => {
        if (!ent.name.toLowerCase().includes(part.toLowerCase())) {
          renameFile(folder, ent.name, `${part} - ${ent}`)
        }
      });
    }
  }),
}

export default module;

