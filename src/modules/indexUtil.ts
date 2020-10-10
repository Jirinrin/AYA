import { OperationMaker, IterationType, Operation } from "../types";
import ENV from "../ENV";
import { forEveryEntry, forEveryEntryDeep } from "../util";

export function makeOperation(maker: OperationMaker, iterationType: IterationType): Operation {
  switch (iterationType) {
    case IterationType.shallow:
      return makeShallowOperation(maker);
    case IterationType.deep:
      return makeDeepOperation(maker);
  }
}

function makeShallowOperation(maker: OperationMaker): Operation {
  return maker(cb => forEveryEntry(ENV.cwd, cb));
}

function makeDeepOperation(maker: OperationMaker): Operation {
  const rawOp = maker(cb => forEveryEntryDeep(ENV.cwd, cb));
  return {
    abbrev: `${rawOp.abbrev}-deep`,
    help: `${rawOp.help} - But recursively for the set depth`,
    run: rawOp.run,
  };
}
