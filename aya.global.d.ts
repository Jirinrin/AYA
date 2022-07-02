// todo: somehow auto-generate this file

import { LoDashStatic } from 'lodash';
import { SuperAgentStatic } from 'superagent';
import JSONBigInt from 'json-bigint';
import { Dirent } from 'fs';
import { PlatformPath } from 'path';
import { IAudioMetadata } from 'music-metadata';
import { Tags as ExifTags } from 'exiftool-vendored';

declare global {
  type FileIteratorCallback = (ent: DirentWithMetadata, folder: string) => void;
  type IGetEntsFilters = { entType?: EntityType; filter?: string | RegExp; ext?: string | RegExp; };
  type IScanOptions = { dontLogScanning?: boolean; noMetadata?: boolean; };
  type DirentWithData = { ext: string; nameBase: string; path: string } & Dirent;
  type DirentWithMetadata = { mm?: IAudioMetadata; em?: ExifTags; } & DirentWithData;
  type EntityType = 'file' | 'directory';
  type ENV = { cwd: string, currentDirItems: string[], dontLogScanning: boolean, noMetadata: boolean, scanExcludeFilter: RegExp, extraScriptsDirItems: string[]; }
  
  /**
   * Execute a command that will be executed in the underlying shell environment.
   */
  function exec(cmd: string, opts?: {printOutput?: boolean, cwd?: string}): Promise<void>;
  /**
   * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
   * [int]: the total number of lines going back that you want
   * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
   * [...int[]]: the indices of the lines that you wanted, counting back from the current line
   */
  function scriptFromHistory(from: number): string;
  
  // For these fs-like methods, for args with the word 'path' in them you can use relative (to the cwd) or absolute paths
  // Exept for exists(), all of these have a command version as well for ease of use.
  function mkdir(dirPath: string): string;
  function exists(path: string): boolean;
  function move(filePath: string, moveToFolder: string, newFileName?: string): string;
  function copy(filePath: string, copyToFolder: string, newFileName?: string): string;
  function rename(filePath: string, newFileName: string): string;
  function remove(filePath: string): Promise<void>;
  function removeMulti(filePaths: string|string[]): Promise<void>;
  function metadata(filePath: string): Promise<DirentWithMetadata>;
  function getEnts(filePath?: string, opts?: IGetEntsFilters): DirentWithMetadata[];
  function getFirstEnt(filePath?: string, opts?: IGetEntsFilters): DirentWithMetadata|undefined;
  function getEntsDeep(filePath?: string, opts?: IGetEntsFilters): DirentWithMetadata[];
  function getEntsWithMetadata(filePath?: string, opts?: IGetEntsFilters): Promise<DirentWithMetadata[]>;
  function getEntsNames(filePath?: string, opts?: IGetEntsFilters): string[];
  function getFirstEntName(filePath?: string, opts?: IGetEntsFilters): string|undefined;
  
  function doForEach(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
  function doForEachDeep(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
  
  function cd(toDir: string): void;
  function withCwd<T>(tempCwd: string, callback: () => T): T;
  
  // The manual version of resolving a relative/absolute path
  function resolvePath(filePath: string): string;
  
  // Set exif metadata
  function setTags(filePath: string, tags: Record<string, any>): Promise<void>;
  
  const env: ENV; // Used for some internal stuff, but also contains e.g. cwd
  const JSONbig: typeof JSONBigInt;
  
  const lo: LoDashStatic;
  const req: SuperAgentStatic;
  const path: PlatformPath;
  
  // todo: write docs for these functions
  
  function readJson(filePath: string): any;
  function readFile(filePath: string, encoding?: string): string;
  function writeJson(filePath: string, data: any, log?: boolean): void;
  function writeFile(filePath: string, data: any, opts?: { log?: boolean, encoding?: string }): void;
  function editFile(filePath: string, editCallback: (fileContents: string) => string): void;
  
  // setTags: wrapResolvePath1(setExifMetadata);
  
  function esc(str: string): string;
  function escPath(str: string): string;
  function cwdRel(path: string): string;
  
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
  
  function splitFileName(fileName: string, isDirectory?: boolean): [nameBase: string, ext: string];
  
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
}
