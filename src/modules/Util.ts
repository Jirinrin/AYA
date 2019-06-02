import * as fs from 'fs';
import * as path from 'path';

export function renameFile(containerFolder: string, fileName: string, newFileName: string) {
  fs.rename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName),
    () => {},
  );
}
