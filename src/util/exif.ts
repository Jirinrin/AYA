import * as path from 'path';
import { exiftool, Tags, WriteTags } from 'exiftool-vendored';
import { DirentWithMetadata } from '../types';

export async function getExifMetadata(filePath?: string): Promise<Tags | null> {
  try {
    return await exiftool.read(filePath);
  } catch {
    return null;
  }
}

export async function setExifMetadata(filePath: string, tags: WriteTags): Promise<void> {
  await exiftool.write(filePath, tags);
  console.log(`Successfully set metadata on ${filePath}`);
}

export async function putExifMetadataOnEntity(ent: DirentWithMetadata, folder: string): Promise<DirentWithMetadata> {
  const em = await getExifMetadata(path.join(folder, ent.name));
  ent.em = em;
  return ent;
}
