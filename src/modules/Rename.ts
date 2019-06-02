import { renameFile } from './Util';
import { forEveryEntry } from '../IndexUtil';
import ENV from '../ENV';
import { RawModule } from '../types';

const module: RawModule = {
  everyEntryRename: {
    abbrev: 'eer',
    help: 'rename every entry in folder using {$1: (fileName: string) => string}',
    run: (renameCallback: (fileName: string) => string) => {
      forEveryEntry(ENV.folder, (folder, ent) => {
        renameFile(folder, ent.name, renameCallback(ent.name));
      });
    }
  },

  everyEntryHasToMatch: {
    abbrev: 'eehtm',
    help: 'for every entry in folder rename to {$2: string} if it matches {$1: regex}',
    /**
     * @param exp: thing to try to match
     * @param put: thing to put before the fileName
     */
    run: (exp: RegExp, put: string) => {
      forEveryEntry(ENV.folder, (folder, ent) => {
        if (!ent.name.toLowerCase().match(exp)) {
          renameFile(folder, ent.name, `${put} - ${ent}`);
        }
      });
    }
  },

  everyEntryHasToInclude: {
    abbrev: 'eehti',
    help: 'for every entry in folder rename if it includes {$1: string} you provide',
    /**
     * @param part: thing that every filename has to include
     */
    run: (part: string) => {
      forEveryEntry(ENV.folder, (folder, ent) => {
        if (!ent.name.toLowerCase().includes(part.toLowerCase())) {
          renameFile(folder, ent.name, `${part} - ${ent}`)
        }
      });
    }
  },
}

export default module;

