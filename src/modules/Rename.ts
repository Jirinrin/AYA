import { splitFileName, simpleRename } from './Util';
import { FileIteratorInitFunction, FileMetadata, RawModule } from '../types';

export type EntityType = 'file' | 'directory';
interface RenameOptions {
  skipEntType?: EntityType;
  includeExt?: boolean;
  musicFiles?: boolean; // Only rename music files, exposing metadata of the files
  imageFiles?: boolean; // Only rename image files, exposing exif metadata of the files
}

const eerOpts = "--skipEntType=file|directory, --includeExt, --musicFiles, --imageFiles"

const renameEveryEntry = (iterate: FileIteratorInitFunction) => (
  renameCallback: (fileName: string, metadata?: Object) => string, 
  {skipEntType, includeExt, musicFiles, imageFiles}: RenameOptions = {},
) =>
  iterate((folder, ent) => {
    let metadata: FileMetadata = {};
    if (musicFiles) {
      metadata.mm = ent.mm;
      if (!metadata.mm) {
        return;
      }
    } else if (imageFiles) {
      metadata.im = ent.im;
      if (!metadata.im) {
        return;
      }
    }

    const rename = (name: string, metadata?: Object) => {
      const result = renameCallback(name, metadata);
      if (!result) throw new Error('Please return something from your renaming function');
      return result;
    }

    let newName: string;
    if (includeExt) {
      newName = rename(ent.name, metadata);
    } else {
      const [baseName, ext] = splitFileName(ent.name);
      metadata.ext = ext.replace('.', '');
      newName = rename(baseName, metadata) + ext;
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


const Rename: RawModule = {
  everyEntryRename: iterate => ({
    abbrev: 'eer',
    help: `Rename every entry in folder using {$1: (fileName: string, metadata?) => string}. opts: ${eerOpts}`,
    run: renameEveryEntry(iterate),
  }),
  everyEntryRenameRegex: iterate => ({
    abbrev: 'eer-rx',
    help: `Rename every entry in folder using {$1: regex}, {$2: replace pattern}. opts: ${eerOpts}`,
    run: (
      searchRegex: string|RegExp,
      replacePattern: string,
      opts?: RenameOptions,
    ) => {
      if (typeof searchRegex === 'string')
        searchRegex = new RegExp(searchRegex);
      return renameEveryEntry(iterate)(fileName => fileName.replace(searchRegex, replacePattern), opts)
    },
  }),
}

export default Rename;
