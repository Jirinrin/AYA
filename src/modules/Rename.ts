import { simpleRename, checkFilter, highlightExps, cwdRel } from '../util';
import { FileIteratorFunction, FileMetadata, IMetadataFilterOpts, metadataFilterOpt, RawModule } from '../types';

interface RenameOptions extends IMetadataFilterOpts {
  includeExt?: boolean;
}

const reeOpts = `--includeExt, ${metadataFilterOpt}`

const renameEveryEntry = (iterate: FileIteratorFunction<string>) => (
  renameCallback: (fileName: string, metadata?: FileMetadata) => string | Promise<string>,
  opts: RenameOptions = {},
) =>
  iterate(async (ent, folder) => {
    if (!checkFilter(ent, opts))
      return;

    const rename = async (name: string, metadata?: FileMetadata) => {
      const result = await renameCallback(name, metadata);
      if (!result) throw new Error('Please return something from your renaming function');
      return result;
    }

    const newName = (opts.includeExt || ent.isDirectory())
      ? (await rename(ent.name, ent)).trim()
      : (await rename(ent.nameBase, ent)) + '.'+ent.ext;

    if (ent.name !== newName) {
      const renamedName = simpleRename(folder, ent.name, newName, ent.isDirectory());
      console.log(highlightExps`Renamed "${cwdRel(ent.path)}" to "${renamedName}"`);
      return newName;
    }
  });


const Rename: RawModule = {
  'renameEach': { // everyEntryRename
    help: `Rename every entry in folder using {$1: (fileName: string, metadata?) => string} | opts: ${reeOpts}`,
    getRun: iterate => renameEveryEntry(iterate),
  },
  'renameEachRx': { // everyEntryRenameRegex
    help: `Rename every entry in folder using {$1: regex}, {$2: replace pattern} | opts: ${reeOpts}`,
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
