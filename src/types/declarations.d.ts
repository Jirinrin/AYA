export declare module 'repl' {
  interface REPLServer {
    history: string[];
    line: string;
    _replaceCurrentLine(replaceBy: string): void;
    _tabComplete(lastKeypressWasTab: boolean): void;
  }
}

declare global {
  namespace NodeJS {
    interface Process {
      pkg?: {
        entrypoint: string;
        defaultEntrypoint: string;
        path: { resolve: Function };
        mount: Function;
      };
    }
  }
}

type PartOfCollectionNumber = number | `${number}` | `${number}/${number}`

declare module 'exiftool-vendored' {
  interface Tags {
    Album?: string;
    PartOfSet?: PartOfCollectionNumber;
    Track?: PartOfCollectionNumber;
    Year?: string;
    Band?: string;
    Albumartist?: string;
    AlbumArtist?: string;
    // Picture?: any;
    FileCreateDate?: string|ExifDateTime;
    Lyrics?: string; // on MP3
    UnsyncedLyrics?: string; // on FLAC
    SyncedLyrics?: string; // on FLAC
    UserDefinedText?: string; // on MP3 this contains extra tags you added, e.g. "(SYNCED LYRICS) blablabla"
    Bpm?: number;
    BeatsPerMinute?: number;
    Duration?: number; // in seconds
  }
}
