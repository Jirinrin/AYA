import { Module, Operation, ShallowDeepRawOperation, RawModule, RawOperation, BaseOperation, SimpleRawOperation } from '../types';
import { forEveryEntry, forEveryEntryDeep, getFunctionData } from '../util';
import ENV from '../ENV';

import Rename from './Rename';
import FolderOperations from './FolderOperations';
import Base from './Base';

// todo: evall/evalls right in this file; and also generating cmdInfo

const rawModules: RawModule[] = [
  Base,
  Rename,
  FolderOperations,
];

function makeShallow(op: ShallowDeepRawOperation, cmdName: string): Operation {
  const { paramNames, hasOpts } = getFunctionData(op.getRun(null as any));
  if (!hasOpts) paramNames.push('opts');

  const newOp: Operation = {
    cmdName,
    help: `${op.help}${hasOpts ? ',' : ' | opts:'} --deep(-d)`,
    simple: false,
    run: async (...args: Parameters<ReturnType<typeof op.getRun>>) => { // Implied that params now contains an 'opts' param as last
      let opts = args[args.length-1];
      if (typeof opts !== 'object') opts = {};
      const iterator = opts.deep ? forEveryEntryDeep : forEveryEntry;
      return op.getRun(cb => iterator(ENV.cwd, cb))(...args);
    }
  }
  newOp.run.paramNames = paramNames;
  return newOp;
}

function isShallowDeep(op: RawOperation): op is ShallowDeepRawOperation {
  return !!op['getRun'];
}
function isSimp(op: RawOperation): op is SimpleRawOperation {
  return !!op['run_s'];
}

function makeOperation(op: RawOperation, cmdName: string): Operation {
  if (isShallowDeep(op)) return makeShallow(op, cmdName);
  return {
    cmdName,
    help: op.help,
    ...(isSimp(op)
      ? { simple: true, run: op.run_s }
      : { simple: false, run: op.run }
    ),
  };
}


const modules: Module[] = rawModules.map(m =>
  Object.entries(m).map(([k, op]) => makeOperation(op, k))
);

export default modules;
