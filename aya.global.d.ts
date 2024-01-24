// todo: somehow auto-generate this file

import chalk from 'chalk';
import { LoDashStatic } from 'lodash';
import { SuperAgentStatic } from 'superagent';
import JSONBigInt from 'json-bigint';
import { createWriteStream as fsCreateWriteStream, Stats } from 'fs';
import { PlatformPath } from 'path';
import { IAudioMetadata, IPicture } from 'music-metadata';
import { Tags as ExifTags } from 'exiftool-vendored';
import { Tags as ID3Tags } from 'node-id3';

declare global {
  type ExecSharedOpts = {cwd?: string, allowFail?: boolean};

  /** Execute a command that will be executed in the underlying shell environment. */
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
  /** Returns all entities within a given {@link dirPath}, constrained by {@link opts} */
  function getEnts(dirPath?: string, opts?: IGetEntsFilters): DirentWithData[];
  /** Returns all entities with extra file stats within a given {@link dirPath}, constrained by {@link opts} */
  function getEntsWithStats(filePath?: string, opts?: IGetEntsFilters): (DirentWithData & Stats)[];
  /** Returns the first ent (or undefined) within a given {@link dirPath}, constrained by {@link opts} */
  function getFirstEnt(dirPath?: string, opts?: IGetEntsFilters): DirentWithData|undefined;
  /** Returns all ents within a given {@link dirPath} recursively drilling down, constrained by {@link opts} */
  function getEntsDeep(dirPath?: string, opts?: IGetEntsFilters): DirentWithData[];
  /** Returns all ents within a given {@link dirPath} with their extra file metadata (asynchronously), constrained by {@link opts} */
  function getEntsWithMetadata(dirPath?: string, opts?: IGetEntsFilters): Promise<DirentWithMetadata[]>;
  /** Returns the names of all entities within a given {@link dirPath}, constrained by {@link opts} */
  function getEntsNames(dirPath?: string, opts?: IGetEntsFilters): string[];
  /** Returns the name of the first entity within a given {@link dirPath}, constrained by {@link opts} */
  function getFirstEntName(dirPath?: string, opts?: IGetEntsFilters): string|undefined;

  // todo: write docs for a lot of these functions

  /** Run {@link callback} for each entry in {@link dirPath}, constrained by {@link opts} */
  function doForEach(dirPath: string, callback: FileIteratorCallback, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
  /** Run {@link callback} for each entry in {@link dirPath} recursively until the max recursion depth, constrained by {@param opts} */
  function doForEachDeep(dirPath: string, callback: FileIteratorCallback, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
  
  /** Change the CWD to a new path */
  function cd(toDir: string): void;
  /** Run a callback with a temporary different CWD */
  function withCwd<T>(tempCwd: string, callback: () => T): T;

  // Set exif metadata
  function setTags(filePath: string, tags: Record<string, any>): Promise<void>;
  function getTrackInfoFromMetadata(metadata: DirentWithMetadata): MusicTrackInfo;
  function writeMp3Metadata(filePath: string, tags: Partial<ID3TrackInfo>, writeMode?: boolean): void;
  function readMp3Metadata(filePath: string): ID3Tags;

  /** Read a given file, directly parsing it as JSON */
  function readJson<T = any>(filePath: string): T;
  /** Read a given file, returning the contents as string */
  function readFile(filePath: string, encoding?: string): string;
  /** Write an object to a given file, as a formatted JSON string */
  function writeJson(filePath: string, data: any, log?: boolean): void;
  /** Write a string to a given file */
  function writeFile(filePath: string, data: any, opts?: { log?: boolean, encoding?: string }): void;
  /** Shorthand to edit (read&write) the contents of a file using {@link editCallback} */
  function editFile(filePath: string, editCallback: (fileContents: string) => string): void;
  const createWriteStream: typeof fsCreateWriteStream;

  function showColor(hex: string, customStr?: string): void;

  const ch: chalk.Chalk;
  const lo: LoDashStatic;
  const req: SuperAgentStatic;
  const path: PlatformPath;
  const fs: FileSystem;
  
  /** The manual version of resolving a relative/absolute path */
  function resolvePath(relOrAbsPath: string): string;
  /** Return a path as it would look relative to the CWD (useful for overseeable logging) */
  function cwdRel(path: string): string;
  /** Replace characters illegal in your filesystem by ugly full-width unicode versions */
  function esc(str: string): string;
  /** Replace characters illegal in your filesystem by ugly full-width unicode versions, at the last part of a given path */
  function escPath(str: string): string;
  
  /** Copy a string value to your clipboard */
  function copyClb(str: string): void;
  /** Copy an object to your clipboard as a formatted JSON string */
  function copyClbJSON(entity: any): void;
  /** Returns whatever is on your clipboard as a string */
  function pasteClb(): string;
  /** Runs whatever is on your clipboard, evaluating it as JS (Typescript code also gets accepted) in the context of the REPL */
  function pasteScript(): void;
  /** Returns whatever is on your clipboard, parsing it as JSON */
  function pasteClbJSON(): any;
  /** Edits the string that is on your clipboard using {@param editCallback}, writing it back to the clipboard */
  function editClb(editCallback: (oldClb: string) => string): void;
  
  function setConsoleIndent(indents: number): void;
  function withDeeperIndentation<T>(callback: () => T): T;
  /** Template string operator function which highlights all template args inserted (useful for logging) */
  function highlightExp(strings: TemplateStringsArray, ...exps: (string | number)[]): string;

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
    /** Log to the aya.log file instead of the terminal -- verbose */
    llogv: Console['log'];
    /** Log to the aya.log file instead of the terminal */
    llog: Console['log'];
    /** Log to the aya.log file and to the terminal */
    llogl: Console['log'];
    /** Log to the file p-log.json, which persists between aya sessions */
    plog: Console['log'];
    /** Log in a fancy purple color */
    logPurple: Console['log'];
    /** Log in a fancy pink color */
    logPink: Console['log'];
    /** Log verbosely (i.e. object arguments are written out over multiple lines) */
    logv: Console['log'];
    /** Log directly to process.stdout */
    logsl: Console['log'];
  }
  
  type FileIteratorCallback = (ent: DirentWithMetadata, folder: string) => void;
  type IGetEntsFilters = { entType?: EntityType; filter?: string | RegExp; ext?: string | RegExp; progressUpdates?: boolean; };
  type IScanOptions = { dontLogScanning?: boolean; noMetadata?: boolean; scanExcludeFilter?: string|RegExp; };
  type Dirent = { isFile(): boolean; isDirectory(): boolean; name: string; }
  type DirentWithData = { ext: string; nameBase: string; path: string; dirPath: string } & Dirent;
  type DirentWithMetadata = { mm?: IAudioMetadata; em?: ExifTags; trackInfo?: MusicTrackInfo } & Stats & DirentWithData;
  type EntityType = 'file' | 'directory';
  type ENV = { cwd: string, currentDirItems: string[], dontLogScanning: boolean, noMetadata: boolean, scanExcludeFilter: RegExp, progressUpdates: boolean, extraScriptsDirItems: string[]; };
  type ID3TrackInfo = ID3Tags & { [K in 'unsyncedLyrics'|'syncedLyrics']?: string; };
  
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
