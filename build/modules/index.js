"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("../types");
var Rename_1 = require("./Rename");
var indexUtil_1 = require("./indexUtil");
var normalModules = []
    .map(function (module) { return Object.values(module); });
var factoryModules = [
    Rename_1.default,
]
    .reduce(function (modules, mod) {
    return modules.concat(Object.values(mod).map(function (maker) {
        return [
            indexUtil_1.makeOperation(maker, types_1.IterationType.shallow),
            indexUtil_1.makeOperation(maker, types_1.IterationType.deep),
        ];
    }));
}, []);
var modules = normalModules.concat(factoryModules);
exports.default = modules;
