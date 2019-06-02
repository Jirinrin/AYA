import { Module } from '../types';
import Rename from './Rename';

const modules: Module[] = [
  Rename,
]
.map((module) => Object.values(module));

export default modules;