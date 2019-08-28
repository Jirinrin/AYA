import * as path from 'path';
import { Dirent } from 'fs';
import { ExifImage, ExifData } from 'exif';

export async function getImageFileMetadata(filePath: string): Promise<ExifData | null> {
  try {
    return await new Promise((res, rej) => {
      new ExifImage({ image: filePath }, (err, exifData) => {
        if (err) rej(err);
        else     res(exifData);
      });
    });
  } catch {
    return null;
  }
}

export async function putImageMetadataOnEntity(folder: string, ent: Dirent): Promise<Dirent> {
  const im = await getImageFileMetadata(path.join(folder, ent.name));
  (ent as any).im = im;
  return ent;
}
