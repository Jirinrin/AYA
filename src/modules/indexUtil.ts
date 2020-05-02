import { OperationMaker, IterationType, Operation } from "../types";
import { forEveryEntry, forEveryEntryDeep } from "../IndexUtil";
import ENV from "../ENV";

export function makeOperation(maker: OperationMaker, iterationType: IterationType): Operation {
  switch (iterationType) {
    case IterationType.shallow:
      return makeShallowOperation(maker);
    case IterationType.deep:
      return makeDeepOperation(maker);
  }
}

function makeShallowOperation(maker: OperationMaker): Operation {
  return maker(cb => forEveryEntry(ENV.folder, cb));
}

function makeDeepOperation(maker: OperationMaker): Operation {
  const rawOp = maker(cb => forEveryEntryDeep(ENV.folder, cb));
  return {
    abbrev: `${rawOp.abbrev}-deep`,
    help: `${rawOp.help} - But recursively for the set depth`,
    run: rawOp.run,
  };
}
