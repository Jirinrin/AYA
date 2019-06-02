import { renameFile } from './Util';
import ENV from '../ENV';
import { RawFactoryModule, FileIteratorFunction } from '../types';

const module: RawFactoryModule = {
  everyEntryRename: (iterator: FileIteratorFunction) => ({
    abbrev: 'eer',
    help: 'rename every entry in folder using {$1: (fileName: string) => string}',
    // TODO: add option to only rename base name (so don't regard extension if applicable and then append it at the end)
    // TODO: add option to only rename directory <> file names
    run: (renameCallback: (fileName: string) => string) => {
      iterator(ENV.folder, (folder, ent) => {
        const newName = renameCallback(ent.name);
        if (ent.name !== newName) {
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

