import { OperationMaker, IterationType, Operation } from "../types";
import { forEveryEntry, forEveryEntryDeep } from "../IndexUtil";

export function makeOperation(maker: OperationMaker, iterationType: IterationType): Operation | never {
  switch (iterationType) {
    case IterationType.shallow:
      return makeShallowOperation(maker);
    case IterationType.deep:
      return makeDeepOperation(maker);
  }
  throw new Error(`Invalid iteration type: ${iterationType}`)
}

function makeShallowOperation(maker: OperationMaker): Operation {
  return maker(forEveryEntry);
}

function makeDeepOperation(maker: OperationMaker): Operation {
  const rawOp = maker(forEveryEntryDeep);
  return {
    abbrev: `${rawOp.abbrev}-deep`,
    help: `${rawOp.help} - You may supply the {recursionDepth: number} as last argument`,
    run: rawOp.run,
  };
}
