import * as path from 'path';

export function getAyaRootDir() {
  return process.pkg
    ? path.resolve(process.execPath, '../..')
    : path.resolve(path.dirname(require.main.filename), '..');
}

export function getAyaBuildDir() {
  return path.join(getAyaRootDir(), 'build');
}
