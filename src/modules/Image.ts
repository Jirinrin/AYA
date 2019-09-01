import * as path from 'path';
import { exiftool, Tags } from 'exiftool-vendored';
import { Entry } from '../types';

export async function getImageFileMetadata(filePath?: string): Promise<Tags | null> {
  try {
    return await exiftool.read(filePath);
  } catch {
    return null;
  }
}

export async function putImageMetadataOnEntity(folder: string, ent: Entry): Promise<Entry> {
  const im = await getImageFileMetadata(path.join(folder, ent.name));
  ent.im = im;
  return ent;
}
