import { IPicture } from "music-metadata";

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

export interface ITrackInfo {
  title: string;
  trackNo?: number;
  artist?: string;
  // Not necessary for filename
  albumArtist?: string;
  album?: string;
  date?: string;
  picture?: IPicture[];
}
