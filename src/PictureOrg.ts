import { forEveryEntry } from "./IndexUtil";
import ENV from "./ENV";
import { Dirent, rename } from "fs";
import * as path from 'path';
import { FileIteratorCallback } from "./types";
import { splitFileName } from "./modules/Util";

function addTag(fileName: string, tag: string): string {
  const [baseName, ext] = splitFileName(fileName);
  return baseName.replace(/__t=.+$/, '') + `__t=${tag}` + ext;
}

function extractTag(fileName: string): string|undefined {
  const [baseName, _] = splitFileName(fileName);
  const match = baseName.match(/__t=(.+)$/);
  return match && match[1];
}

export function movePicturesTo(tag?: string) {
  doPerCollection((collectionFolderPath, fileEnt) => {
    if (!fileEnt.isFile())
      return;

    const currentFileTag = extractTag(fileEnt.name);
    
    if (!currentFileTag)
      return;
    if (tag && currentFileTag !== tag)
      return;

    // TODO: create tag folder if necessary
    rename(
      path.join(collectionFolderPath, fileEnt.name),
      path.join(collectionFolderPath, currentFileTag, fileEnt.name),
      () => {},
    );
  });
}

export function movePicturesFro(tag?: string) {
  doPerCollection((collectionFolderPath, tagFolderEnt) => {
    if (!tagFolderEnt.isDirectory())
      return;
    if (tag && tagFolderEnt.name !== tag)
      return;

    forEveryEntry(path.join(collectionFolderPath, tagFolderEnt.name), (tagFolderPath, pictureEnt) => {
      // TODO: make the renaming safe
      rename(
        path.join(tagFolderPath, pictureEnt.name),
        path.join(collectionFolderPath, addTag(pictureEnt.name, tagFolderEnt.name)),
        () => {},
      );
    });
  });
}

export function doPerCollection(callback: FileIteratorCallback) {
  forEveryEntry(ENV.folder, (folder, ent: Dirent) => {
    if (!ent.isDirectory())
      return;
    
    const collectionFolderPath = path.join(folder, ent.name);

    forEveryEntry(collectionFolderPath, callback);
  });
}