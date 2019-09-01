import * as path from 'path';
import { Dirent } from 'fs';
import { exiftool, Tags } from 'exiftool-vendored';

export async function getImageFileMetadata(filePath?: string): Promise<Tags | null> {
  try {
    return await exiftool.read(filePath);
  } catch {
    return null;
  }
}

export async function putImageMetadataOnEntity(folder: string, ent: Dirent): Promise<Dirent> {
  const im = await getImageFileMetadata(path.join(folder, ent.name));
  (ent as any).im = im;
  return ent;
}
