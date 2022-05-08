import { Module, Operation, RawOperationShallowDeep, RawOperation, ActionFunctionEvall } from '../types';
import { doForEach, doForEachDeep, getFunctionData, parseArgs, wrapScanOptions } from '../util';
import ENV from '../ENV';
import { evall } from '../util/replUtils';

import Rename from './Rename';
import FolderOperations from './FolderOperations';
import Base, { helpp } from './Base';

const rawModules = {
  Base,
  Rename,
  FolderOperations,
};

function makeShallow(op: RawOperationShallowDeep, info: CommandInfo): ActionFunctionEvall {
  const { paramNames } = getFunctionData(op.getRun(null as any));

  const [actionShallow, actionDeep] = [doForEach, doForEachDeep].map(iter => {
    const output = op.getRun((cb, dirOverwrite?) => iter(dirOverwrite ?? ENV.cwd, cb));
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

// todo: move to better location (?)
export const getCommand = (line: string) =>
  (line.match(/^\.(\S+)( *)/) ?? []) as [cmdMatch?: string, cmdName?: string, space?: string];

export interface CommandInfo {
  help: string;
  opts?: string[];
  renderOpts?: string[]; // parallel to opts
  optsValues?: Record<string, string[]>;
  optsAliases?: Record<string, string>;
  boolOpts?: string[],
  boolOptsPadded?: string[], // includes the same values with extra trailing space to account for splitting algorithm
}
export const cmdInfo: Record<string, CommandInfo> = {};

function getCmdInfo(help: string): CommandInfo {
  const info: CommandInfo = { help };
  help
    .match(/--[\w=|\(\)\-\./<>]+/g)
    ?.forEach(o => {
      let [_, opt, alias, val] = o.match(/^--([^\(\)=]+)(?:\(-(\w)\))?(?:=(.+))?$/) ?? [];
      if (!_) return;
      (info.opts??=[]).push(opt);
      (info.renderOpts??=[]).push(`--${opt}` + (val ? '=' : ''));
      if (val?.includes('|'))
        (info.optsValues??={})[opt] = val.split('|');
      if (alias)
        (info.optsAliases??={})[alias] = opt;
      if (!val) {
        (info.boolOpts??=[]).push(opt);
        (info.boolOptsPadded??=[]).push(opt, opt+' ');
      }
    });
  (info.boolOptsPadded??=[]).push(' '); // Hacky thing to prevent an extra ' ' argument taking up some afterlying code as its value
  return info;
}


function makeOperation(op: RawOperation, cmdName: string): Operation {
  const isShd = isShallowDeep(op);

  let help = op.help ?? '';
  if (isShd)
    help += `${help.includes('opts:') ? '' : ' | opts:'} --deep(-d)`;

  const info = getCmdInfo(help);
  cmdInfo[cmdName] = info;  // side effect yay! Though maybe this whole global variable is unnecessary?

  const action = isShd ? makeShallow(op, info) : evall(op.run, info);

  return {
    help,
    action: async (argsString) => {
      const [rawArgs, opts] = parseArgs(argsString, info);

      if (opts.help)
        return helpp(cmdName);

      return wrapScanOptions(
        // If the passed args happen to have these options, they're simply included without asking more
        {noMetadata: opts.noMetadata || (isShd && op.noMetadata), dontLogScanning: opts.dontLogScanning, scanExcludeFilter: opts.scanExcludeFilter},
        () => action(rawArgs, opts)
      );
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
