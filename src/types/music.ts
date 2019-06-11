import { IPicture } from "music-metadata";

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