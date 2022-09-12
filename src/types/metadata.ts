import { IPicture } from "music-metadata";
import * as NodeID3 from 'node-id3';
import { PartOfCollectionNumber } from "./declarations";

const metadataFilters = [
  'file',
  'directory',
  'musicFiles', // Only use music files, exposing metadata of the files
  'imageFiles', // Only use image files, exposing exif metadata of the files
  'videoFiles', // Only use image files, exposing exif metadata of the files
  '.<ext>' as `.${string}`, // Used for filtering by file extension (gets put in regex)
  '/<nameRegex>/' as `/${string}/`, // Used for filtering by regex
] as const;
type MetadataFilter = typeof metadataFilters[number];
export interface IMetadataFilterOpts { filter?: MetadataFilter }
export const metadataFilterOpt = '--filter=' + metadataFilters.join('|');

export interface MusicTrackInfo {
  title: string;
  track?: number;
  disk?: number;
  artist?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  date?: string;
  picture?: IPicture[];
  unsyncedLyrics?: string;
  syncedLyrics?: string;
  bpm?: number;
  totalTracks?: number;
  totalDisks?: number;
}

export const userDefinedID3Tags = {unsyncedLyrics: 'UNSYNCED LYRICS', syncedLyrics: 'SYNCED LYRICS'} as const;
export type UserDefinedID3Field = keyof typeof userDefinedID3Tags;

export type ID3TrackInfo = NodeID3.Tags & {
  trackNumber?: PartOfCollectionNumber;
  partOfSet?: PartOfCollectionNumber;
  // todo: what can you do with the "image" field here? Because it seems it only contains 1 image
} & Partial<Record<UserDefinedID3Field, string>>;
