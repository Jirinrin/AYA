import { Module, RawModule, IterationType, OperationMaker, Operation } from '../types';
import { makeOperation } from './indexUtil';

import Rename from './Rename';
import FolderOperations from './FolderOperations';

const rawModules: RawModule[] = [
  Rename,
  FolderOperations,
]

const modules: Module[] = rawModules
  .reduce((modules: Module[], rawModule: RawModule) => {
    return [
      ...modules,
      ...Object.values(rawModule).map((op: Operation | OperationMaker) => {
        if (typeof op == 'object') return [op];
        else return [
          makeOperation(op, IterationType.shallow),
          makeOperation(op, IterationType.deep),
        ];
      }),
    ];
  }, []);

export default modules;