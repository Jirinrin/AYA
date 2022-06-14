// todo: somehow auto-generate this file

type Dirent = {};
type FileIteratorCallback = (ent: DirentWithMetadata, folder: string) => void;
type IGetEntsFilters = { entType?: EntityType; filter?: string | RegExp; ext?: string | RegExp; };
type IScanOptions = { dontLogScanning?: boolean; noMetadata?: boolean; };
type DirentWithMetadata = { ext: string; nameBase: string; path: string; mm?: any; em?: any; } & Dirent;
type EntityType = 'file' | 'directory';
type ENV = any;
type Lodash = any;
type JSONBigInt = any;

export type a = {}

declare global {
  interface Window {
    /**
     * Execute a command that will be executed in the underlying shell environment.
     */
    exec(cmd: string): Promise<void>;
    /**
     * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
     * [int]: the total number of lines going back that you want
     * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
     * [...int[]]: the indices of the lines that you wanted, counting back from the current line
     */
    scriptFromHistory(from: number): string;

    // For these fs-like methods, for args with the word 'path' in them you can use relative (to the cwd) or absolute paths
    // Exept for exists(), all of these have a command version as well for ease of use.
    mkdir(dirPath: string): void;
    exists(path: string): void;
    move(filePath: string, moveToDirPath: string): void;
    copy(filePath: string, copyToDirPath: string): void;
    rename(filePath: string, newFileName: string): void;
    metadata(filePath: string): Promise<DirentWithMetadata>;
    getEnts(filePath: string, opts?: IGetEntsFilters): DirentWithMetadata[];
    getEntsDeep(filePath: string, opts?: IGetEntsFilters): DirentWithMetadata[];
    getEntsWithMetadata(filePath: string, opts?: IGetEntsFilters): Promise<DirentWithMetadata[]>;
    getEntsNames(filePath: string, opts?: IGetEntsFilters): string[];

    doForEach(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;
    doForEachDeep(filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts?: IGetEntsFilters & IScanOptions): Promise<void>;

    // The manual version of resolving a relative/absolute path
    resolvePath(filePath: string): string;

    // Set exif metadata
    setTags(filePath: string, tags: Record<string, any>): Promise<void>;

    env: ENV; // Used for some internal stuff, but also contains e.g. cwd
    JSONbig: JSONBigInt;

    lo: Lodash;

    // todo: write docs for these functions

    readJson(filePath: string): any;
    readFile(filePath: string, encoding?: string): string;
    writeJson(filePath: string, data: any, log?: boolean): void;
    writeFile(filePath: string, data: any, opts?: { log?: boolean, encoding?: string }): void;
    editFile(filePath: string, editCallback: (fileContents: string) => string): void;

    // setTags: wrapResolvePath1(setExifMetadata);

    esc(str: string): string;
    escPath(str: string): string;
    cwdRel(path: string): string;

    copyClb(str: string): void;
    copyClbJSON(entity: any): void;
    pasteClb(): string;
    pasteClbJS(): void;
    pasteClbJSON(): any;
    editClb(editCallback: (oldClb: string) => string): void;

    setConsoleIndent(indents: number): void;
    highlightExp(strings: TemplateStringsArray, ...exps: (string | number)[]): string;
    listlan(): string[], // list languages

    splitFileName(fileName: string, isDirectory?: boolean): [nameBase: string, ext: string];

    question(q: string): Promise<string>;
  }
}

// todo: tell about r`oijwe\foi`