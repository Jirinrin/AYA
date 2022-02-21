import { Dirent } from "fs";
import { IAudioMetadata } from "music-metadata";
import * as exif from "exiftool-vendored";
import { CustomFunction } from "../util";

export interface FileData {
  ext: string;
  nameBase: string; // basename without ext
  path: string;
}
export interface FileMetadata {
  mm?: IAudioMetadata;
  em?: exif.Tags;
}

export interface DirentWithData extends Dirent, FileData {}
export interface DirentWithMetadata extends DirentWithData, FileMetadata {}

export type FileIteratorCallback<TReturn extends any = any> = (ent: DirentWithMetadata, containerFolder: string) => TReturn|Promise<TReturn>;
export type FileIteratorFunction<T=any> = (callback: FileIteratorCallback<T>, dirOverwrite?: string) => void|Promise<void>;

export type ActionFunction = (argsString: string) => void|Promise<void>;
export type ActionFunctionEvall = (rawArgs: string[], opts: Record<string, any>) => void|Promise<void>;
export type OperationFunction = CustomFunction & {(...args: any[]): any|Promise<any>};

interface BaseOperation {
  help?: string;
}
export interface RawOperationNormal extends BaseOperation {
  run: OperationFunction;
}
export interface RawOperationShallowDeep extends BaseOperation {
  noMetadata?: boolean;
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
