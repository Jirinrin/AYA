# AYA

AYA (Ayaya!) is a wonderful/powerful CLI tool which enables you to:
- **Manipulate your file system** in all kinds of ways, allowing to **write complex logic and save it for later use**
- Do all the things a NodeJS REPL does, but with syntax highlighting and better auto-completion

To get started, either grab an executable from the releases (currently Windows only) on Github, or clone the repo to get the latest and greatest.  
For the latter, run `yarn init` to start off. This will build the JS and generate an executable for your system architecture to use.  
Then make it accessible from your shell by adding either the [/path](/path) directory or the generated `/bin` directory to your PATH.

Have fun with it!

**But tread with care! Aya is powerful and has all the priviledges your shell has, therefore one wrong command can seriously screw with your files and directories.**


## How it works

Aya's environment has some similarities to a shell: you always have a `.cwd`, and you can `.ls` and `.cd` to undiscovered places.

The core of Aya is a system of commands which (recursively) iterate over the files in your current working directory. Some of these commands allow you to pass in options and arguments, which can be simple strings or entire javascript callbacks to define the logic that is executed for each item.

Let's look at the main command on which a lot of other commands are built: `doForEach`. This command expects you to give it a JS callback which it will then execute for each item. For instance:
```js
.doForEach f => console.log(f.name, f.ext)
```
or:
```js
var counter = 0
.doForEach f => console.log(counter++)
```
Or what about another command I personally use a lot in batch renaming things in my file system:
```js
var counter = 0
.renameEach fileName => `[${counter++}] ` + fileName.replace(/bla[012]/, 'blargh') --entType=file
```
Or what if you combine this with the built-in `exec()` function (docs [down below](##-Available-JS-globals))? Zip all files in a directory just like that:
```js
.doForEach f => exec(`7za a \"${f.nameBase}.zip\" \"${f.name}\" `)
```

And it gets even cooler! To iterating commands like these you can add the `--deep`/`-d` option, which will make things go recursive to the number of levels specified in `config.recursionDepth`.  
Watch out with this, as things can get ridiculous real quick. Especially when e.g. renaming directories that it then tries to scan items of etc...


## Userscripts

A useful feature of Aya is userscripts: sequences of lines to be executed which you can save accross sessions.  
Use the `userscript` commands (see `.help`) to interact with these.

Useful note: use the `scriptFromHistory()` global function (docs [down below](##-Available-JS-globals)) e.g. like this: `.userscript-set scriptFromHistory(1, 4)`


## Config

There are some config values you can set from the CLI, which will be persisted even when closing and reopening Aya.
Use the `config` commands (see `.help`) to interact with these.

Explanation of the different config keys:
- `recursionDepth`: Set how many layers the `--deep` versions of iterative commands continue.
- `syntaxHighlighting`: Toggle syntax highlighting (because it may impact performance).
- `musicMetadata`: Toggle fetching music-related metadata.
- `exifMetadata`: Toggle fetching metadata on all kinds of files.
- `alwaysStart`: Set to true to have aya always start in the current working directory, so you don't have to specify the `-s` flag.
- `initScriptsDir`: Set this to a directory path for aya to load all scripts in that directory into its context. This allows you to expose custom functions you use a lot.
- `extraScriptsDir`: Set this to a directory path, from which you can directly load the JS files using `.loadScript`. Useful for scripts you only need once in a while.

## Available commands

I don't really feel like listing all commands here, so just type `.help` to get a list of all commands.  
If you want to get just a single command's help, use the `.helpp` command, or add the `--help` flag to it.

There are a few default NodeJS REPL commands which you may want to be aware of: `.break`, `.clear`, `.editor`, `.exit`, `.load`, `.save`. These probably work as expected but I'm not making any guarantees.


## Init args

There are some arguments available to pass to Aya:
- `--start` / `-s` => start Aya without asking for a starting directory
- If you just throw in some arguments, they'll be parsed as being a userscript:
  - Multiple line splitting with `\n` or `;;`
  - Can reference to commands with or without dot
  - Can reference to userscript with or without `.u(serscript)` in front
  - Random js code also works as usual
- `--continueAfterCmd` / `-co` => When providing stuff to run on init, Aya will by default close when it's done. Setting this option allows you to continue using it after the command/userscript is done.
- `--dir` / `-d` => set starting directory as a command line arg
- `--help`: get the available init flags


## Random info about the REPL

It is recommended that you use `var` instead of `const`/`let`, because autocompletion only works with the former.


## Available JS globals

```ts
interface {
  /**
   * Execute a command that will be executed in the underlying shell environment.
   */
  exec: (cmd: string) => Promise<void>;
  /**
   * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
   * [int]: the total number of lines going back that you want
   * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
   * [...int[]]: the indices of the lines that you wanted, counting back from the current line
   */
  scriptFromHistory(from: number): string;

  // For these fs-like methods, for args with the word 'path' in them you can use relative (to the cwd) or absolute paths
  // Exept for exists(), all of these have a command version as well for ease of use.
  mkdir: (dirPath: string) => void;
  exists: (path: string) => void;
  move: (filePath: string, moveToDirPath: string) => void;
  copy: (filePath: string, copyToDirPath: string) => void;
  rename: (filePath: string, newFileName: string) => void;
  metadata: (filePath: string) => Promise<DirentWithMetadata>;
  getEnts: (filePath: string) => DirentWithMetadata[]; // todo: add options docs
  getEntsWithMetadata: (filePath: string) => Promise<DirentWithMetadata[]>; // todo: add options docs
  getEntsNames: // todo

  doForEach:     (filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts: IGetEntsFilters & IScanOptions = {}) => Promise<void>;
  doForEachDeep: (filePath: string, callback: (ent: DirentWithMetadata, folder: string) => void, opts: IGetEntsFilters & IScanOptions = {}) => Promise<void>;

  // The manual version of resolving a relative/absolute path
  resolvePath: (filePath: string) => string;

  // Set exif metadata
  setTags: (filePath: string, tags: Record<string, any>) => Promise<void>;


  env: ENV; // Used for some internal stuff, but also contains e.g. cwd
  JSONbig: JSONBigInt;

  lo: Lodash;

  // todo: docs
  // setTags: wrapResolvePath1(setExifMetadata),

  // readjson, writejson, readfile, writefile, editFile

  // esc
  // escPath
  // cwdRel

  // copyClb
  // copyClbJSON
  // pasteClb
  // pasteClbJS
  // pasteClbJSON
  // editClb

  // setConsoleIndent,
  // highlightExp,
  // listlan,

  // splitFileName,

  // question,
}

// todo: tell about r`oijwe\foi`
```


## File metadata

The files passed in `doForEach` (and other commands) have some 'metadata' on them, which you can use to make decisions.

```ts
interface {
  // Dirent
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  name: string; // basename with ext
  // Custom metadata
  mm?: IAudioMetadata; // If config.musicMetadata == true
  em?: exif.Tags; // If config.exifMetadata == true
  ext: string;
  nameBase: string; // basename without ext
  path: string;
  dirPath: string;
}
```


## TODO
- go through todos in code
- refresh ENV.currentDirItems on more occasions / use in all places where you can use relative paths / implement fancier hash-based recursive system or sth
- add to readme some gameplay footage
- allow force quitting a command that's taking a long time
- add ora fancy spinner thingy on longer running scripts?
- have some [iter] like (colored?) label in the help of commands that iterate
- do exe releases every once in a while? (and for macos and debian would need to do in docker container)
- be able to give argument to userscripts?
- some system for deep iteration to e.g. rename a folder and then still be able to go through the items in it
