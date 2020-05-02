import { Module, RawModule, RawFactoryModule, IterationType, OperationMaker } from '../types';
import { makeOperation } from './indexUtil';

import Rename from './Rename';
import FolderOperations from './FolderOperations';

const normalModules: Module[] = [
  FolderOperations,
]
.map((module: RawModule) => Object.values(module));

const factoryModules: Module[] = [
  Rename,
]
.reduce((modules: Module[], mod: RawFactoryModule) => {
  return [
    ...modules,
    ...Object.values(mod).map((maker: OperationMaker) => {
      return [
        makeOperation(maker, IterationType.shallow),
        makeOperation(maker, IterationType.deep),
      ];
    }),
  ];
}, []);

const modules: Module[] = [
  ...normalModules,
  ...factoryModules,
];


export default modules;