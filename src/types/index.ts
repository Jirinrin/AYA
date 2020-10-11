import { Dirent } from "fs";
import { IAudioMetadata } from "music-metadata";
import { Tags } from "exiftool-vendored";
import { CustomFunction } from "../util";

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

type IFunction = (...args: any) => any;

export interface Operation {
  cmdName: string;
  help: string;
  run: CustomFunction;
}
export interface ShallowDeepRawOperation {
  cmdName: string;
  help: string;
  getRun: ((iterator: FileIteratorInitFunction) => IFunction) & CustomFunction;
};

export interface RawModule {
  [operationName: string]: Operation | ShallowDeepRawOperation,
}

export type Module = Operation[];

export * from './music';
