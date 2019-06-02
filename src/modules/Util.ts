import * as fs from 'fs';
import * as path from 'path';

export function renameFile(containerFolder: string, fileName: string, newFileName: string) {
  if (fs.existsSync(path.join(containerFolder, newFileName))) {
    let i = 1;
    const ext = path.extname(newFileName);
    const baseName = ext ? newFileName.split(ext)[0] : newFileName;
    while (i < 100) {
      const newNewFileName = `${baseName} (${i})${ext}`;
      if (!fs.existsSync(path.join(containerFolder, newNewFileName))) {
        return renameFile(containerFolder, fileName, newNewFileName);
      }
      i++;
    }
    return new Error('Couldn\'t rename file in 100 incrementing tries');
  }

  fs.rename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName),
    () => {},
  );
}
