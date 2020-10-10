import { Dirent } from "fs";
import { IAudioMetadata } from "music-metadata";
import { Tags } from "exiftool-vendored";

export interface FileMetadata {
  mm?: IAudioMetadata;
  im?: Tags;
  ext?: string;
}

export interface Entry extends Dirent, FileMetadata {}

export type FileIteratorCallback = (folder: string, ent: Entry) => void;
export type FileIteratorCallbackSimple = (ent: Entry) => void;
export type FileIteratorFunction = (folder: string, callback: FileIteratorCallback) => void;
export type FileIteratorInitFunction = (callback: FileIteratorCallback) => void;
export enum IterationType {
  'shallow',
  'deep',
}
// export type IterationType = typeof IterationTypes;

export interface Operation {
  abbrev: string;
  help: string;
  run: Function;
};
export type OperationMaker = (iterator: FileIteratorInitFunction) => Operation;

export interface RawModule {
  [operationName: string]: Operation | OperationMaker,
}

export type Module = Operation[];

export * from './music';