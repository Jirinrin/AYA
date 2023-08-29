import * as path from 'path';

export function getAyaExecDir() {
  return process.pkg
    ? path.resolve(process.execPath, '..')
    : path.resolve(path.dirname(require.main.filename), '..');
}

export function getAppData() {
  const ad = process.platform === 'win32' ? process.env.APPDATA : process.env.HOME;
  if (!ad) console.warn('AppData dir could not be found');
  return ad;
}

export const ayaStorageDir = process.pkg
  ? path.join(getAppData(), 'aya')
  : path.join(getAyaExecDir(), 'build', '.ayastorage')
