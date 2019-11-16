import { forEveryEntry, forEveryEntrySync } from "./IndexUtil";
import ENV from "./ENV";
import C from "./CONST";
import { Dirent, rename } from "fs";
import * as path from 'path';
import { FileIteratorCallback } from "./types";
import { splitFileName, renameFile } from "./modules/Util";

function addTag(fileName: string, tag: string): string {
  const [baseName, ext] = splitFileName(fileName);
  return baseName.replace(/__t=.+$/, '') + `__t=${tag}` + ext;
}

function removeTag(fileName: string): string {
  const [baseName, ext] = splitFileName(fileName);
  return baseName.replace(/__t=.+$/, '') + ext;
}

function extractTag(fileName: string): string|undefined {
  const [baseName, _] = splitFileName(fileName);
  const match = baseName.match(/__t=(.+)$/);
  return match && match[1];
}

export function movePicturesTo(tag?: string|string[]) {
  const tags: string[]|undefined = tag && (typeof tag === 'string' ? [tag] : tag);
  
  if (tags)
    console.log(`Moving pictures with tags [${tags}] to tag folders...`);
  else
    console.log(`Moving all tagged pictures to tag folders...`);

  doPerCollection((collectionFolderPath, fileEnt) => {
    if (!fileEnt.isFile())
      return;

    const currentFileTag = extractTag(fileEnt.name);
    
    if (!currentFileTag)
      return;
    if (tags && !tags.includes(currentFileTag))
      return;

    // TODO: create tag folder if necessary
    rename(
      path.join(collectionFolderPath, fileEnt.name),
      path.join(collectionFolderPath, currentFileTag, fileEnt.name),
      () => {},
    );
  });
}

export function movePicturesFro(tag?: string|string[]) {
  const tags: string[]|undefined = tag && (typeof tag === 'string' ? [tag] : tag);

  if (tags)
    console.log(`Moving fro pictures with tags [${tags}]...`);
  else
    console.log(`Moving fro all pictures in tag folders...`);

  doPerCollection((collectionFolderPath, tagFolderEnt) => {
    if (!tagFolderEnt.isDirectory())
      return;
    if (tags && !tags.includes(tagFolderEnt.name))
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

export function doPerCollection(callback: FileIteratorCallback, sync?: boolean) {
  const forEveryEntryVariant = sync ? forEveryEntrySync : forEveryEntry;

  forEveryEntryVariant(ENV.folder, (folder, ent: Dirent) => {
    if (!ent.isDirectory())
      return;
    
    const collectionFolderPath = path.join(folder, ent.name);

    forEveryEntryVariant(collectionFolderPath, callback);
  });
}

export function config(configName: string) {
  const config = C.pictureOrgConfigs[configName];
  if (!config) {
    console.error(`Could not find config "${configName}". Available config names: ${Object.keys(C.pictureOrgConfigs)}`);
    return;
  }
  console.log('Selected config:', configName);
  movePicturesFro(config.fro);
  movePicturesTo(config.to);
}

export function resetTags(arg) {
  if (arg !== '--yes') {
    console.log('This command is dangerous, please run it with the argument "--yes" to execute it');
    return;
  }

  console.log('Resetting tags...');
  doPerCollection((collectionFolderPath, ent) => {
    // Remove tags on files in root folders
    if (ent.isFile()) {
      const newName = removeTag(ent.name);
      if (newName !== ent.name) {
        renameFile(
          collectionFolderPath,
          ent.name,
          newName,
        );
      }

    // Ensure tags on files in tag folders match their folder name
    } else if (ent.isDirectory()) {
      forEveryEntry(path.join(collectionFolderPath, ent.name), (tagFolderPath, pictureEnt) => {
        const newName = addTag(pictureEnt.name, ent.name);

        if (newName !== pictureEnt.name) {
          renameFile(
            tagFolderPath,
            pictureEnt.name,
            newName,
          );
        }
      });
    }
  });
}

export function countVisiblePictures() {
  let count = 0;

  console.log('Counting visible pictures...');

  doPerCollection((collectionFolderPath, ent) => {
    if (ent.isFile())
      count++;
  }, true);

  console.log('Visible pictures:', count);
}