import { Module, Operation, RawOperationShallowDeep, RawModule, RawOperation, RawOperationSimple, RawOperationCompiled, ActionFunction, ActionFunctionEvall } from '../types';
import { forEveryEntry, forEveryEntryDeep, getFunctionData, parseArgs } from '../util';
import ENV from '../ENV';
import { evall, evalls } from '../util/replUtils';

import Rename from './Rename';
import FolderOperations from './FolderOperations';
import Base from './Base';

const rawModules = {
  Base,
  Rename,
  FolderOperations,
};

function makeShallow(op: RawOperationShallowDeep, info: CommandInfo): ActionFunctionEvall {
  const { paramNames } = getFunctionData(op.getRun(null as any));

  const [actionShallow, actionDeep] = [forEveryEntry, forEveryEntryDeep].map(iter => {
    const output = op.getRun(cb => iter(ENV.cwd, cb));
    output.paramNames = paramNames;
    return evall(output, info);
  });

  return async (body, opts) => {
    const run = opts.deep ? actionDeep : actionShallow;
    return run(body, opts);
  };
}

function isShallowDeep(op: RawOperation): op is RawOperationShallowDeep {
  return !!op['getRun'];
}
function isCompiled(op: RawOperation): op is RawOperationCompiled {
  return !!op['run_c'];
}
function isSimp(op: RawOperation): op is RawOperationSimple {
  return !!op['run_s'];
}
function actionIsSimple(op: RawOperation, a: ActionFunction|ActionFunctionEvall): a is ActionFunction {
  return isCompiled(op) || isSimp(op);
}


export interface CommandInfo {
  help: string;
  opts?: string[];
  renderOpts?: string[]; // parallel to opts
  optsValues?: Record<string, string[]>;
  optsAliases?: Record<string, string>;
}
export const cmdInfo: Record<string, CommandInfo> = {};

function getCmdInfo(help: string): CommandInfo {
  const info: CommandInfo = { help };
  help
    .match(/--[\w=|\(\)-]+/g)
    ?.forEach(o => {
      let [_, opt, alias, val] = o.match(/^--([^\(\)=]+)(?:\(-(\w)\))?(?:=(.+))?$/) ?? [];
      if (!_) return;
      (info.opts??=[]).push(opt);
      (info.renderOpts??=[]).push(`--${opt}` + (val ? '=' : ''));
      if (val?.includes('|'))
        (info.optsValues??={})[opt] = val.split('|');
      if (alias)
        (info.optsAliases??={})[alias] = opt;
    });
  return info;
}


function makeOperation(op: RawOperation, cmdName: string): Operation {
  let help = op.help;
  let action: ActionFunction|ActionFunctionEvall = null;
  if (isShallowDeep(op))
    help += `${help.includes('opts:') ? ',' : ' | opts:'} --deep(-d)`;

  const info = getCmdInfo(help);
  cmdInfo[cmdName] = info;  // side effect yay! Though maybe this whole global variable is unnecessary?

  if (isShallowDeep(op)) action = makeShallow(op, info);
  else if (isCompiled(op)) action = op.run_c;
  else action = isSimp(op) ? evalls(op.run_s) : evall(op.run, info);

  return {
    help,
    action: async (argsString) => {
      const [body, opts] = parseArgs(argsString, info);

      if (opts.help)
        return (Base.helpp as RawOperationCompiled).run_c(cmdName);

      if (actionIsSimple(op, action))
        return action(argsString);
      else
        return action(body, opts);
    },
  };
}

type IModules = {
  [K in keyof typeof rawModules]: Module<(typeof rawModules)[K]>;
}
const modules: IModules = Object.fromEntries(Object.entries(rawModules).map(([modKey, rawMod]) =>
  [modKey, Object.fromEntries(Object.entries(rawMod).map(([k, op]) =>
    [k, makeOperation(op, k)],
  ))] as [keyof typeof rawModules, Module],
)) as IModules;

export default modules;
