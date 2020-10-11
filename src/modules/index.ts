import { Module, Operation, ShallowDeepRawOperation, RawModule, FileIteratorInitFunction } from '../types';

import Rename from './Rename';
import FolderOperations from './FolderOperations';
import { forEveryEntry, forEveryEntryDeep, getFunctionData } from '../util';
import ENV from '../ENV';

const rawModules: RawModule[] = [
  Rename,
  FolderOperations,
];

function makeShallow(op: ShallowDeepRawOperation): Operation {
  const { paramNames, hasOpts } = getFunctionData(op.getRun(null as any));
  if (!hasOpts) paramNames.push('opts');

  const newOp: Operation = {
    command: op.command,
    help: `${op.help}${hasOpts ? ',' : ' |'} --deep'`,
    run: (...params: Parameters<ReturnType<typeof op.getRun>>) => { // Implied that params now contains an 'opts' param as last
      const opts = params[params.length-1];
      const iterator = opts.deep ? forEveryEntryDeep : forEveryEntry;
      op.getRun(cb => iterator(ENV.cwd, cb))(...params);
    }
  }
  newOp.run.paramNames = paramNames;
  return newOp;
}

function isShallow(op: Operation | ShallowDeepRawOperation): op is Operation {
  return !!op['run'];
}

const modules: Module[] = rawModules.map(m =>
  Object.values(m)
    .map((op): Operation => isShallow(op) ? op : makeShallow(op))
);

export default modules;
