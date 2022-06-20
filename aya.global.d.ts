// todo: somehow auto-generate this file

type Dirent = { name: string; isFile(): boolean; isDirectory(): boolean; isBlockDevice(): boolean; isCharacterDevice(): boolean; isSymbolicLink(): boolean; isFIFO(): boolean; isSocket(): boolean }
type FileIteratorCallback = (ent: DirentWithMetadata, folder: string) => void;
type IGetEntsFilters = { entType?: EntityType; filter?: string | RegExp; ext?: string | RegExp; };
type IScanOptions = { dontLogScanning?: boolean; noMetadata?: boolean; };
type DirentWithMetadata = { ext: string; nameBase: string; path: string; mm?: any; em?: any; } & Dirent;
type EntityType = 'file' | 'directory';
type ENV = any;
type Lodash = any;
type JSONBigInt = any;

/**
 * Execute a command that will be executed in the underlying shell environment.
 */
declare function exec(cmd: string): Promise<void>;
/**
 * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
 * [int]: the total number of lines going back that you want
 * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
 * [...int[]]: the indices of the lines that you wanted, counting back from the current line
 */
declare function scriptFromHistory(from: number): string;

// For these fs-like methods, for args with the word 'path' in them you can use relative (to the cwd) or absolute paths
// Exept for exists(), all of these have a command version as well for ease of use.
declare function mkdir(dirPath: string): string;
declare function exists(path: string): boolean;
declare function move(filePath: string, moveToFolder: string, newFileName?: string): string;
declare function copy(filePath: string, copyToFolder: string, newFileName?: string): string;
declare function rename(filePath: string, newFileName: string): string;
declare function remove(filePath: string): Promise<void>;
declare function removeMulti(filePaths: string|string[]): Promise<void>;
declare function metadata(filePath: string): Promise<DirentWithMetadata>;
declare function getEnts(filePath: string, opts?: IGetEntsFilters): DirentWithMetadata[];
declare function getEntsDeep(filePath: string, opts?: IGetEntsFilters): DirentWithMetadata[];
declare function getEntsWithMetadata(filePath: string, opts?: IGetEntsFilters): Promise<DirentWithMetadata[]>;
declare function getEntsNames(filePath: string, opts?: IGetEntsFilters): string[];

declare function doForEach(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
declare function doForEachDeep(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;

// The manual version of resolving a relative/absolute path
declare function resolvePath(filePath: string): string;

// Set exif metadata
declare function setTags(filePath: string, tags: Record<string, any>): Promise<void>;

declare const env: ENV; // Used for some internal stuff, but also contains e.g. cwd
declare const JSONbig: JSONBigInt;

declare const lo: Lodash;
declare const path: any; // the normal Node path package

// todo: write docs for these functions

declare function readJson(filePath: string): any;
declare function readFile(filePath: string, encoding?: string): string;
declare function writeJson(filePath: string, data: any, log?: boolean): void;
declare function writeFile(filePath: string, data: any, opts?: { log?: boolean, encoding?: string }): void;
declare function editFile(filePath: string, editCallback: (fileContents: string) => string): void;

// setTags: wrapResolvePath1(setExifMetadata);

declare function esc(str: string): string;
declare function escPath(str: string): string;
declare function cwdRel(path: string): string;

declare function copyClb(str: string): void;
declare function copyClbJSON(entity: any): void;
declare function pasteClb(): string;
declare function pasteClbJS(): void;
declare function pasteClbJSON(): any;
declare function editClb(editCallback: (oldClb: string) => string): void;

declare function setConsoleIndent(indents: number): void;
declare function highlightExp(strings: TemplateStringsArray, ...exps: (string | number)[]): string;
declare function listlan(): string[]; // list languages

declare function splitFileName(fileName: string, isDirectory?: boolean): [nameBase: string, ext: string];

declare function question(q: string): Promise<string>;

// todo: tell about r`oijwe\foi`
