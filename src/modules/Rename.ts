import { simpleRename, checkMetadata } from '../util';
import { FileIteratorFunction, FileMetadata, IMetadataFilterOpts, RawModule } from '../types';

export type EntityType = 'file' | 'directory';
interface RenameOptions extends IMetadataFilterOpts {
  skipEntType?: EntityType;
  includeExt?: boolean;
}

const eerOpts = "--skipEntType=file|directory, --includeExt, --musicFiles, --imageFiles"

const renameEveryEntry = (iterate: FileIteratorFunction<string>) => (
  renameCallback: (fileName: string, metadata?: FileMetadata) => string,
  opts: RenameOptions = {},
) =>
  iterate((ent, folder) => {
    if (!checkMetadata(ent, opts))
      return;

    const rename = (name: string, metadata?: FileMetadata) => {
      const result = renameCallback(name, metadata);
      if (!result) throw new Error('Please return something from your renaming function');
      return result;
    }

    const newName = (opts.includeExt || ent.isDirectory())
      ? rename(ent.name, ent).trim()
      : rename(ent.baseName, ent) + '.'+ent.ext;

    if (
      ent.name !== newName &&
      !(ent.isDirectory() && opts.skipEntType === 'directory') && 
      !(ent.isFile() && opts.skipEntType === 'file')
    ) {
      const renamedName = simpleRename(folder, ent.name, newName, ent.isDirectory());
      console.log(`Renamed "${ent.name}" to "${renamedName}"`);
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
      r_searchRegex: string|RegExp,
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
