import { splitFileName, simpleRename } from './Util';
import { FileMetadata, RawModule } from '../types';

export type EntityType = 'file' | 'directory';
interface RenameOptions {
  skipEntType?: EntityType;
  includeExt?: boolean;
  musicFiles?: boolean; // Only rename music files, exposing metadata of the files
  imageFiles?: boolean; // Only rename image files, exposing exif metadata of the files
}

const Rename: RawModule = {
  everyEntryRename: iterate => ({
    abbrev: 'eer',
    help: 'Rename every entry in folder using {$1: (fileName: string, metadata?) => string}. opts: [--skipEntType=file|directory, --includeExt, --musicFiles, --imageFiles]',
    run: (
      renameCallback: (fileName: string, metadata?: Object) => string, 
      {skipEntType, includeExt, musicFiles, imageFiles}: RenameOptions = {}
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

        let newName: string;
        if (includeExt) {
          newName = renameCallback(ent.name, metadata);
        } else {
          const [baseName, ext] = splitFileName(ent.name);
          metadata.ext = ext.replace('.', '');
          newName = renameCallback(baseName, metadata) + ext;
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
      })
  }),

  // everyEntryHasToMatch: (iterator: FileIteratorInitFunction) => ({
  //   abbrev: 'eehtm',
  //   help: 'for every entry in folder rename to {$2: string} if it matches {$1: regex}',
  //   /**
  //    * @param exp: thing to try to match
  //    * @param put: thing to put before the fileName
  //    */
  //   run: (exp: RegExp, put: string) => {
  //     iterator((folder, ent) => {
  //       if (!ent.name.toLowerCase().match(exp)) {
  //         renameFile(folder, ent.name, `${put} - ${ent}`);
  //       }
  //     });
  //   }
  // }),

  // everyEntryHasToInclude: (iterator: FileIteratorInitFunction) => ({
  //   abbrev: 'eehti',
  //   help: 'for every entry in folder rename if it includes {$1: string} you provide',
  //   /**
  //    * @param part: thing that every filename has to include
  //    */
  //   run: (part: string) => {
  //     iterator((folder, ent) => {
  //       if (!ent.name.toLowerCase().includes(part.toLowerCase())) {
  //         renameFile(folder, ent.name, `${part} - ${ent}`)
  //       }
  //     });
  //   }
  // }),
}

export default Rename;
