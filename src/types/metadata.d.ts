import { IPicture } from "music-metadata";

export interface IMetadataFilterOpts {
  musicFiles?: boolean; // Only use music files, exposing metadata of the files
  imageFiles?: boolean; // Only use image files, exposing exif metadata of the files
}

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
