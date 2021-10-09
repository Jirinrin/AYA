import { exiftool, Tags, WriteTags } from 'exiftool-vendored';

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
