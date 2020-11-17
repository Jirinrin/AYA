import * as path from 'path';
import * as mm from 'music-metadata';
import { ITrackInfo, DirentWithMetadata } from '../types';

function formatTrackNo(number: number|string, length = 2): string {
  const strNum: string = '' + number;
  return strNum.length < length 
    ? `0${strNum}` 
    : strNum;
}

function formatMusicFileName(trackInfo: ITrackInfo): string {
  return `${formatTrackNo(trackInfo.trackNo)} ${trackInfo.artist ? trackInfo.artist + ' -' : ''} ${trackInfo.title}`;
}

function getTrackInfoFromMusicMetadata(trackMetadata: mm.IAudioMetadata): ITrackInfo {
  const cmn = trackMetadata.common;
  if (!cmn.title) {
    throw new Error('Track metadata does not even have a title');
  }
  return {
    title: cmn.title,
    trackNo: cmn.track.no,
    artist: cmn.artist || cmn.albumartist || cmn.artists.join(', '),
    album: cmn.album,
    date: cmn.date || (cmn.year && '' + cmn.year) || cmn.originaldate,
    picture: cmn.picture,
  }
}

function writeMusicMetadataToFile(filePath: string, trackInfo: ITrackInfo) {
  return;
}



export async function getMusicFileMetadata(filePath: string): Promise<mm.IAudioMetadata | null> {
  try {
    return await mm.parseFile(filePath);
  } catch {
    return null;
  }
}

export async function putMusicMetadataOnEntity(ent: DirentWithMetadata, folder: string): Promise<DirentWithMetadata> {
  const mm = await getMusicFileMetadata(path.join(folder, ent.name));
  delete mm?.common.picture;
  ent.mm = mm;
  return ent;
}

// todo: have extra methods on mm which will e.g. return a nicely formatted track number (with 0 in front) etc.

// todo: make function which will just nicely format all relevant music in the foobar2000 way,
// automatically turning on ENV.musicMetadata and calling everyEntryRename with the right options

/*
automatisch muziekmapjes renamen met artiest in naam hebben ook in artiestmapjes (maar alleen als het het nog niet heeft)
en dus zorgen dat ik naar dummytussenmapje layout van Myu kan kopieren, en ook altijd die standaardmapjes van losseliedjes includeren, en dan een scriptje om (spul naar mp3 om te zetten en oude spul te verwijderen en) de redundant mapjes weer te vernietigen aan het eind
↑ is misschien eerder voor het sync-python-project? Of gwn alles daarvan hierheen migreren...?
*/