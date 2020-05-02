import * as fs from 'fs';
import * as path from 'path';

export function safeRename(oldPath: string, newPath: string, isDirectory?: boolean): string {
  if (fs.existsSync(newPath)) {
    let i = 1;
    const [baseName, ext] = splitFileName(path.basename(newPath), isDirectory);
    while (i < 100) {
      const newNewName = `${baseName} (${i})${ext}`;
      const newNewPath = path.resolve(newPath, '..', newNewName);
      if (!fs.existsSync(newNewPath)) {
        return safeRename(oldPath, newNewPath, isDirectory);
      }
      i++;
    }
    throw new Error(`Couldn\'t safely rename file in 100 incrementing tries:: ${oldPath} -> ${newPath}`);
  }

  fs.renameSync(oldPath, newPath);
  return path.basename(newPath);
}

export function splitFileName(fileName: string, isDirectory?: boolean): [string, string] {
  if (isDirectory) return [fileName, ''];

  const ext = path.extname(fileName);
  const baseName = ext ? fileName.split(ext)[0] : fileName;
  return [baseName, ext];
}

export function simpleRename(containerFolder: string, fileName: string, newFileName: string, isDirectory?: boolean): string {
  return safeRename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName),
    isDirectory,
  );
}

export function simpleMove(originalFolderPath: string, fileName: string, newFolderPath: string, isDirectory?: boolean): string {
  return safeRename(
    path.join(originalFolderPath, fileName),
    path.join(newFolderPath,      fileName),
    isDirectory,
  );
}
