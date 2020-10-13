import { splitFileName, simpleRename } from '../util';
import { FileIteratorFunction, FileMetadata, RawModule } from '../types';

export type EntityType = 'file' | 'directory';
interface RenameOptions {
  skipEntType?: EntityType;
  includeExt?: boolean;
  musicFiles?: boolean; // Only rename music files, exposing metadata of the files
  imageFiles?: boolean; // Only rename image files, exposing exif metadata of the files
}

const eerOpts = "--skipEntType=file|directory, --includeExt, --musicFiles, --imageFiles"

const renameEveryEntry = (iterate: FileIteratorFunction<string>) => (
  renameCallback: (fileName: string, metadata?: FileMetadata) => string,
  {skipEntType, includeExt, musicFiles, imageFiles}: RenameOptions = {},
) =>
  iterate((ent, folder) => {
    if (musicFiles && !ent.mm)
      return;
    else if (imageFiles && !ent.im)
      return;

    const rename = (name: string, metadata?: FileMetadata) => {
      const result = renameCallback(name, metadata);
      if (!result) throw new Error('Please return something from your renaming function');
      return result;
    }

    let newName: string;
    if (includeExt) {
      newName = rename(ent.name, ent);
    } else {
      newName = rename(ent.baseName, ent) + '.'+ent.ext;
    }

    if (
      ent.name !== newName && 
      !(ent.isDirectory() && skipEntType === 'directory') && 
      !(ent.isFile() && skipEntType === 'file')
    ) {
      const renamedName = simpleRename(folder, ent.name, newName, ent.isDirectory());
      console.log(`Renamed ${ent.name} to ${renamedName}`);
      return newName;
    }
  });


const Rename = {
  'renameEach': { // everyEntryRename
    help: `Rename every entry in folder using {$1: (fileName: string, metadata?) => string} | opts: ${eerOpts}`,
    getRun: iterate => renameEveryEntry(iterate),
  },
  'renameEach-rx': { // everyEntryRenameRegex
    help: `Rename every entry in folder using {$1: regex}, {$2: replace pattern} | opts: ${eerOpts}`,
    getRun: iterate => (
      ss_searchRegex: string|RegExp,
      s_replacePattern: string,
      opts?: RenameOptions,
    ) => {
      if (typeof r_searchRegex === 'string')
        r_searchRegex = new RegExp(r_searchRegex);
      return renameEveryEntry(iterate)(fileName => fileName.replace(r_searchRegex, s_replacePattern), opts)
    },
  },
}

export default Rename;
