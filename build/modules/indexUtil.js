"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("../types");
var IndexUtil_1 = require("../IndexUtil");
function makeOperation(maker, iterationType) {
    switch (iterationType) {
        case types_1.IterationType.shallow:
            return makeShallowOperation(maker);
        case types_1.IterationType.deep:
            return makeDeepOperation(maker);
    }
    throw new Error("Invalid iteration type: " + iterationType);
}
exports.makeOperation = makeOperation;
function makeShallowOperation(maker) {
    return maker(IndexUtil_1.forEveryEntry);
}
function makeDeepOperation(maker) {
    var rawOp = maker(IndexUtil_1.forEveryEntryDeep);
    return {
        abbrev: rawOp.abbrev + "-deep",
        help: rawOp.help + " - But recursively for the set depth",
        run: rawOp.run,
    };
}
