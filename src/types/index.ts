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

export type FileIteratorCallback<TReturn extends any = any> = (ent: Entry, folder: string) => TReturn|Promise<TReturn>;
export type FileIteratorFunction<T=any> = (callback: FileIteratorCallback<T>) => void;

export type OperationFunction = CustomFunction & {(...args: any): any|Promise<any>};

export interface BaseOperation {
  help: string;
  run: OperationFunction;
}
export interface ShallowDeepRawOperation {
  help: string;
  getRun: (iterator: FileIteratorFunction) => OperationFunction;
};
export interface SimpleRawOperation {
  help: string;
  run_s: OperationFunction;
};
export interface Operation extends BaseOperation {
  cmdName: string;
  simple: boolean;
}

export type RawOperation = BaseOperation | SimpleRawOperation | ShallowDeepRawOperation;
export type RawModule = Record<string, RawOperation>;
export type Module = Array<Operation>;

export * from './music';
