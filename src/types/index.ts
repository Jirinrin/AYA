import { Dirent } from "fs";
import { IAudioMetadata } from "music-metadata";
import * as exif from "exiftool-vendored";
import { CustomFunction } from "../util";

export interface FileMetadata {
  mm?: IAudioMetadata;
  em?: exif.Tags;
  ext: string;
  baseName: string; // todo: less confusing naming for this? (Because path.basename is incl ext)
  path: string;
}

export interface DirentWithMetadata extends Dirent, FileMetadata {}

export type FileIteratorCallback<TReturn extends any = any> = (ent: DirentWithMetadata, folder: string) => TReturn|Promise<TReturn>;
export type FileIteratorFunction<T=any> = (callback: FileIteratorCallback<T>, dirOverwrite?: string) => void;

export type ActionFunction = (argsString: string) => any|Promise<any>;
export type ActionFunctionEvall = (rawArgs: string[], opts: Record<string, any>) => any|Promise<any>;
export type OperationFunction = CustomFunction & {(...args: any[]): any|Promise<any>};

interface BaseOperation {
  help?: string;
}
export interface RawOperationNormal extends BaseOperation {
  run: OperationFunction;
}
export interface RawOperationShallowDeep extends BaseOperation {
  getRun: (iterator: FileIteratorFunction) => OperationFunction;
};
export interface Operation extends BaseOperation {
  action: ActionFunction;
}

export type RawOperation = RawOperationNormal | RawOperationShallowDeep;
export type RawModule = Record<string, RawOperation>;
export type Module<T extends RawModule = any> = {[K in keyof T]: Operation};

export type EntityType = 'file' | 'directory';

export * from './metadata';
