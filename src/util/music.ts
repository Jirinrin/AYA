import { ExifDate, ExifDateTime } from 'exiftool-vendored';
import { IAudioMetadata, parseFile } from 'music-metadata';
import NodeID3 = require('node-id3');
import { DirentWithMetadata, ID3TrackInfo, MusicTrackInfo, UserDefinedID3Field, userDefinedID3Tags } from '../types';
import { PartOfCollectionNumber } from '../types/declarations';
import { cwdRel } from './fsUtils';
import { highlightExp } from './generalUtils';

function parseCollectionNumber(num: PartOfCollectionNumber|undefined): [] | [no: number] | [no: number, of: number] {
  if (num === undefined)
    return [];
  if (typeof num === 'number')
    return [num];
  const [, no, of] = num.match(/(\d+)(?:\/(\d+))?/) ?? [];
  if (no === undefined)
    return [];
  return of !== undefined ? [parseInt(no), parseInt(of)] : [parseInt(no)];
}

export function getTrackInfoFromMetadata(e: DirentWithMetadata): MusicTrackInfo {
  if (!e.em && !e.mm)
    throw new Error('Must turn on either exifMetadata or musicMetadata');

  const {em} = e;
  const mm = e.mm?.common;

  const title = em?.Title ?? mm?.title;
  if (!title)
    throw new Error(highlightExp`Track metadata does not even have a title (${cwdRel(e.path)})`);

  let year = em?.Year ?? em?.Date ?? em?.DateTime ?? em?.DateTimeOriginal ?? mm?.year ?? mm?.date ?? mm?.originalyear ?? mm?.originaldate;
  if (year instanceof ExifDate || year instanceof ExifDateTime)
    year = year.year;
  else if (typeof year === 'string' && year.length > 4)
    year = (year+'').match(/\d{4}/)?.[0] ?? year;
  // todo: make this functional (like I currently have it in aya-scripts)
  const [track, totalTracks] = mm ? [mm.track.no, mm.track.of] : parseCollectionNumber(em?.Track ?? em?.TrackNumber);
  const [disk, totalDisks] = mm ? [mm.disk.no, mm.disk.of] : parseCollectionNumber(em?.PartOfSet);

  return {
    artist: em?.Artist ?? mm.artist ?? em?.Albumartist ?? em?.AlbumArtist ?? em?.Band, // todo: do something with mm.artists?
    title,
    album: em?.Album ?? mm?.album,
    date: (em?.Date ?? em?.DateTime ?? mm?.date ?? em?.Year ?? mm?.year)?.toString(),
    year: typeof year === 'number' ? year : year && parseInt(year),
    track,
    totalTracks,
    disk,
    totalDisks,
    albumArtist: em?.Albumartist ?? em?.AlbumArtist ?? em?.Band ?? mm?.albumartist,
    syncedLyrics: em?.SyncedLyrics ?? em?.UserDefinedText?.match(/\(SYNCED LYRICS\) (.+)/si)?.[1],
    unsyncedLyrics: em?.UnsyncedLyrics ?? em?.Lyrics ?? mm?.lyrics?.join('\n') ?? em?.UserDefinedText?.match(/\(UNSYNCED LYRICS\) (.+)/si)?.[1],
    bpm: em?.Bpm ?? em?.BeatsPerMinute ?? mm?.bpm,
    picture: /* todo: `em?.Picture ||` */ mm?.picture,
  }
}

export function writeMp3Metadata(filePath: string, tags: Partial<ID3TrackInfo>, writeMode = false) {
  // N.B. lib typing is incorrect for userDefinedText one, it should just be an array of multiple items instead of a tuple of one item
  const newUserDefinedFields: string[] = [];
  Object.entries(userDefinedID3Tags).forEach(([field, fieldDescription]) => {
    if (!tags[field]) return;

    newUserDefinedFields.push(field as UserDefinedID3Field);
    if (field === 'unsyncedLyrics') // unsyncedLyrics we'd rather set via the "official" field because at we def don't want it shadowed between that and the userdefinedtext
      tags.unsynchronisedLyrics = {language: 'eng', text: tags.unsyncedLyrics};
    else
      tags.userDefinedText = ([...(tags.userDefinedText ?? []), {description: fieldDescription, value: tags[field]}]) as ID3TrackInfo['userDefinedText'];
  });

  let result: true|Error;
  if (writeMode) {
    const currentTags = NodeID3.read(filePath);
    // We can't properly replace userdefinedtext and it will keep around previous entries of the same tag even when 'overwriting' it,
    // so we do some manual stuff to make ensure the same entry won't appear twice in the array
    if (tags.userDefinedText && currentTags.userDefinedText) {
      tags.userDefinedText = [...currentTags.userDefinedText.filter(t => !newUserDefinedFields.includes(t.description)), ...tags.userDefinedText] as ID3TrackInfo['userDefinedText'];
    }
    result = NodeID3.write({...currentTags, ...tags}, filePath);
  } else {
    result = NodeID3.update(tags, filePath);
  }
  if (result instanceof Error) throw result;
  console.log(highlightExp`Successfully wrote mp3 metadata to ${cwdRel(filePath)}`);
}

export async function getMusicFileMetadata(filePath: string): Promise<IAudioMetadata | null> {
  try {
    const mm = await parseFile(filePath);
    delete mm?.common.picture;
    return mm;
  } catch {
    return null;
  }
}
