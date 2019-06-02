import { renameFile } from './Util';
import { forEveryEntry } from '../IndexUtil';

export function everyEntryRename(folder: string, renameCallback: (fileName: string) => string) {
  forEveryEntry(folder, (ent) => {
    renameFile(folder, ent.name, renameCallback(ent.name));
  });
}  

/**
 * @param exp: thing to try to match
 * @param put: thing to put before the fileName
 */
export function everyEntryHasToMatch(folder: string, exp: RegExp, put: string) {
  forEveryEntry(folder, (ent) => {
    if (!ent.name.toLowerCase().match(exp)) {
      renameFile(folder, ent.name, `${put} - ${ent}`);
    }
  });
}

/**
 * @param part: thing that every filename has to include
 */
export function everyEntryHasToInclude(folder: string, part: string) {
  forEveryEntry(folder, (ent) => {
    if (!ent.name.toLowerCase().includes(part.toLowerCase())) {
      renameFile(folder, ent.name, `${part} - ${ent}`)
    }
  });
}
