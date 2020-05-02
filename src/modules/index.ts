import { Module, RawModule, RawFactoryModule, IterationType, OperationMaker } from '../types';
import Rename from './Rename';
import { makeOperation } from './indexUtil';

const normalModules: Module[] = [
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