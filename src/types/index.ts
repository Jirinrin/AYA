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

export type ActionFunction = (argsString: string) => any|Promise<any>;
export type ActionFunctionEvall = (body: string, opts: Record<string, any>) => any|Promise<any>;
export type OperationFunction = CustomFunction & {(...args: any[]): any|Promise<any>};

interface BaseOperation {
  help: string;
}
export interface RawOperationNormal extends BaseOperation {
  run: OperationFunction;
}
export interface RawOperationShallowDeep extends BaseOperation {
  getRun: (iterator: FileIteratorFunction) => OperationFunction;
};
export interface RawOperationSimple extends BaseOperation {
  run_s: ActionFunction;
};
export interface RawOperationCompiled extends BaseOperation {
  run_c: ActionFunction;
};
export interface Operation extends BaseOperation {
  action: ActionFunction;
  cmdName: string;
}

export type RawOperation = RawOperationNormal | RawOperationSimple | RawOperationShallowDeep | RawOperationCompiled;
export type RawModule = Record<string, RawOperation>;
export type Module = Array<Operation>;

export * from './music';
