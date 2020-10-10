# Ayayatsuri

Misc guidance:
- `,,` is the separator between arguments for stuff
- `bat/aya.bat` is the file that runs everything automatically, recommended to make a shortcut to this in your Start Menu
- inputting an object into the CLI needs to be wrapped by `()` parentheses
- use `.help` to know all the commands
- edit config in the file `CONST.ts` (TODO: make this a plain file that's editable so you can set it from the terminal)
- apparently tab completion is a thing for commands

## Music info available
```ts
{ 
  format: {
    tagTypes: [ 'vorbis' ],
    container: 'FLAC',
    codec: 'FLAC',
    lossless: true,
    numberOfChannels: 2,
    bitsPerSample: 16,
    sampleRate: 44100,
    duration: 254.14285714285714,
    bitrate: 1065686.516020236 
  },
  native: undefined,
  common: { 
    track: { no: 6, of: null },
    disk:  { no: 1, of: null },
    title: 'Harakirish mind (feat. Numb\'n\'dub)(Riku Remix)',
    album: 'minority room EP',
    albumartist: 'Yukiyanagi',
    isrc: [ 'QM42K1974586' ],
    artists: [ 'Yukiyanagi' ],
    artist: 'Yukiyanagi',
    barcode: '053000406198',
    composer: [ 'YUKIYA TAKANO' ],
    picture: [ [Object] ] 
  } 
}
```
ent will get property `mm` for you to access

## TODO
- add how-to on using scripts, add examples of things you can do with this thing, supply options, ...
- Expose specific file explorer methods to fee, e.g. a 'move', 'mkdir', 'copy, etc via a separate 'lib' object in the callback, with extra user friendliness allowing e.g. `../dir1`
- allow passing arguments to the initial call of the process (e.g. which command to run, or which userscript to run) (=> enables putting a static bat file in a folder which does a thing)
- access deep version of a command with --deep flag (filter that out)
- add ora fancy spinner thingy

- And clone objects and such
- Also expose 'path' thingy in callback for every item?
- In .help for all commands does not show deep versions, only appends `-deep version available`
- Make forEveryEntryDeep capable of going through multiple nested folders asynchronously (and await that with a Promise.All or something)
- be able to give argument to userscripts?
- somehow catch e.g. 'Uncaught ReferenceError: ls is not defined' and then attempt to find it as a command
