import { Dirent } from "fs";

export type FileIteratorCallback = (folder: string, ent: Dirent) => void;
export type FileIteratorFunction = (folder: string, callback: FileIteratorCallback) => void;
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
export interface RawModule {
  [operationName: string]: Operation,
}

export type OperationMaker = (iterator: FileIteratorFunction) => Operation;
export interface RawFactoryModule {
  [operationName: string]: OperationMaker,
}

export type Module = Operation[];
