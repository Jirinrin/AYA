import * as fs from 'fs';
import * as path from 'path';

export function renameFile(containerFolder: string, fileName: string, newFileName: string): void {
  if (fs.existsSync(path.join(containerFolder, newFileName))) {
    let i = 1;
    const [baseName, ext] = splitFileName(newFileName);
    while (i < 100) {
      const newNewFileName = `${baseName} (${i})${ext}`;
      if (!fs.existsSync(path.join(containerFolder, newNewFileName))) {
        return renameFile(containerFolder, fileName, newNewFileName);
      }
      i++;
    }
    throw new Error('Couldn\'t rename file in 100 incrementing tries');
  }

  fs.renameSync(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName)
  );
}

export function splitFileName(fileName: string): [string, string] {
  const ext = path.extname(fileName);
  const baseName = ext ? fileName.split(ext)[0] : fileName;
  return [baseName, ext];
}