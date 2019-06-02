import * as path from 'path';
import * as mm from 'music-metadata';
import { Dirent } from 'fs';

export async function getMusicFileMetadata(filePath: string): Promise<mm.IAudioMetadata | null> {
  try {
    return await mm.parseFile(filePath);
  } catch {
    return null;
  }
}

export async function putMusicMetadataOnEntity(folder: string, ent: Dirent): Promise<Dirent> {
  const mm = await getMusicFileMetadata(path.join(folder, ent.name));
  (ent as any).mm = mm;
  return ent;
}

// TODO: have extra methods on mm which will e.g. return a nicely formatted track number (with 0 in front) etc.

// TODO: make function which will just nicely format all relevant music in the foobar2000 way, 
// automatically turning on ENV.musicMetadata and calling everyEntryRename with the right options