export interface Operation {
  abbrev: string;
  help: string;
  run: Function;
};

export type Module = Operation[];
export interface RawModule {
  [operationName: string]: Operation,
}
