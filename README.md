# File name manipulator

Misc guidance:
- `,,` is the separator between arguments for stuff
- `index.bat` is the file that runs everything automatically, recommended to make a shortcut to this in your Start Menu
- inputting an object into the CLI needs to be wrapped by `()` parentheses
- use `.help` to know all the commands
- edit config in the file `CONST.ts` (TODO: make this a plain file that's editable so you can set it from the terminal)

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
- Make sure there are no 'any's in the project: custom types that are based on some other type
- And clone objects and such
- Also expose 'path' thingy in callback for every item?
- In .help for all commands does not show deep versions, only appends `-deep version available`
- Expose specific file explorer methods to fee, e.g. a 'move', 'mkdir', 'copy, etc via a separate 'lib' object in the callback, with extra user friendliness allowing e.g. `../dir1`