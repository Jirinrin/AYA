// todo: somehow auto-generate this file

import { LoDashStatic } from 'lodash';
import { SuperAgentStatic } from 'superagent';
import JSONBigInt from 'json-bigint';
import { Dirent, createWriteStream as fsCreateWriteStream } from 'fs';
import { PlatformPath } from 'path';
import { IAudioMetadata, IPicture } from 'music-metadata';
import { Tags as ExifTags } from 'exiftool-vendored';
import { Tags as ID3Tags } from 'node-id3';

declare global {
  type ExecSharedOpts = {cwd?: string, allowFail?: boolean};

  /**
   * Execute a command that will be executed in the underlying shell environment.
   */
  function exec(cmd: string, opts?: ExecSharedOpts & {printOutput?: true, getOutput?: false}): null;
  function exec(cmd: string, opts?: ExecSharedOpts & {printOutput?: true, getOutput: true}): string;
  function exec(cmd: string, opts?: ExecSharedOpts & {printOutput: false, getOutput?: true}): string;
  /**
   * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
   * [int]: the total number of lines going back that you want
   * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
   * [...int[]]: the indices of the lines that you wanted, counting back from the current line
   */
  function scriptFromHistory(from: number): string;
  
  const env: ENV; // Used for some internal stuff, but also contains e.g. cwd
  const JSONbig: typeof JSONBigInt;
  
  // For these fs-like methods, for args with the word 'path' in them you can use relative (to the cwd) or absolute paths
  // Except for exists(), all of these have a command version as well for ease of use.
  function mkdir(dirPath: string): string;
  function exists(path: string): boolean;
  function move(filePath: string, moveToFolder: string, newFileName?: string): string;
  function copy(filePath: string, copyToFolder: string, newFileName?: string): string;
  function rename(filePath: string, newFileName: string, withoutExt?: boolean): string;
  function remove(filePath: string): Promise<void>;
  function removeMulti(filePaths: string|string[]): Promise<void>;
  function metadata(filePath: string): Promise<DirentWithMetadata>;

  // Functions to easily retrieve the entities in a directory.
  function getEnts(filePath?: string, opts?: IGetEntsFilters): DirentWithData[];
  function getFirstEnt(filePath?: string, opts?: IGetEntsFilters): DirentWithData|undefined;
  function getEntsDeep(filePath?: string, opts?: IGetEntsFilters): DirentWithData[];
  function getEntsWithMetadata(filePath?: string, opts?: IGetEntsFilters): Promise<DirentWithMetadata[]>;
  function getEntsNames(filePath?: string, opts?: IGetEntsFilters): string[];
  function getFirstEntName(filePath?: string, opts?: IGetEntsFilters): string|undefined;

  // todo: write docs for a lot of these functions

  function doForEach(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
  function doForEachDeep(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
  
  function cd(toDir: string): void;
  function withCwd<T>(tempCwd: string, callback: () => T): T;

  // Set exif metadata
  function setTags(filePath: string, tags: Record<string, any>): Promise<void>;
  function getTrackInfoFromMetadata(metadata: DirentWithMetadata): MusicTrackInfo;
  function writeMp3Metadata(filePath: string, tags: Partial<ID3TrackInfo>, writeMode?: boolean): void;
  function readMp3Metadata(filePath: string): ID3Tags;

  function readJson<T = any>(filePath: string): T;
  function readFile(filePath: string, encoding?: string): string;
  function writeJson(filePath: string, data: any, log?: boolean): void;
  function writeFile(filePath: string, data: any, opts?: { log?: boolean, encoding?: string }): void;
  function editFile(filePath: string, editCallback: (fileContents: string) => string): void;
  const createWriteStream: typeof fsCreateWriteStream;

  function showColor(hex: string, customStr?: string): void;

  const lo: LoDashStatic;
  const req: SuperAgentStatic;
  const path: PlatformPath;
  
  // The manual version of resolving a relative/absolute path
  function resolvePath(relOrAbsPath: string): string;
  function cwdRel(path: string): string;
  function esc(str: string): string;
  function escPath(str: string): string;
  
  function copyClb(str: string): void;
  function copyClbJSON(entity: any): void;
  function pasteClb(): string;
  function pasteClbJS(): void;
  function pasteClbJSON(): any;
  function editClb(editCallback: (oldClb: string) => string): void;
  
  function setConsoleIndent(indents: number): void;
  function withDeeperIndentation<T>(callback: () => T): T;
  function highlightExp(strings: TemplateStringsArray, ...exps: (string | number)[]): string;
  function listlan(): string[]; // list languages

  const userStorage: {
    get<T>(key: string|number): T | undefined;
    set(key: string|number, data: any): boolean;
    edit<T>(key: string|number, cb: (prev: T|undefined) => T): boolean;
    get keys(): string[];
  };
  
  function splitFileName(fileName: string, isDirectory?: boolean): [nameBase: string, ext: string];
  /** Returns name of a file without its extension */
  function basenameBase(filePathOrName: string): string;
  
  /** Ask for input in classic CLI-style. Response will be trimmed and returned in a promise. This will deadlock the REPL if you top-level await it so don't do that. */
  function question(q: string): Promise<string>;
  
  /** Call the .loadScript command from JS */
  function loadScript(q: string): Promise<any>;
  
  /** Magically escapes any backslashes in a path you pass to it. Don't worry if the syntax highlighting seems off. */
  function r(strings: TemplateStringsArray, ...exps: (string|number)[]): string;
  
  interface Console {
    llogv: Console['log'];
    llog: Console['log'];
    llogl: Console['log'];
    plog: Console['log'];
    logPurple: Console['log'];
    logPink: Console['log'];
    logv: Console['log'];
    logsl: Console['log'];
  }
  
  type FileIteratorCallback = (ent: DirentWithMetadata, folder: string) => void;
  type IGetEntsFilters = { entType?: EntityType; filter?: string | RegExp; ext?: string | RegExp; };
  type IScanOptions = { dontLogScanning?: boolean; noMetadata?: boolean; };
  type DirentWithData = { ext: string; nameBase: string; path: string; dirPath: string } & Dirent;
  type DirentWithMetadata = { mm?: IAudioMetadata; em?: ExifTags; trackInfo?: MusicTrackInfo } & DirentWithData;
  type EntityType = 'file' | 'directory';
  type ENV = { cwd: string, currentDirItems: string[], dontLogScanning: boolean, noMetadata: boolean, scanExcludeFilter: RegExp, extraScriptsDirItems: string[]; }
  type ID3TrackInfo = ID3Tags & { [K in 'unsyncedLyrics'|'syncedLyrics']?: string; }
  
  interface MusicTrackInfo {
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
}
