import chalk from "chalk";
import { existsSync, readdirSync } from "fs-extra";
import { clearScreenDown, Completer, CompleterResult, cursorTo, moveCursor } from "readline";
import * as refractor from "refractor";
import { REPLServer } from "repl";

import { r } from "..";
import ENV from "../ENV";
import { cmdInfo, getCommand } from "../modules/index";
import { escapeRegex, matchString, parseArgs, splitArgsString } from "./generalUtils";
import { defaultHighlightLookup, IHighlightLookup, languageSpecificHighlightLookup } from "./highlightLookup";
import { jsKeywords } from "./input/javascriptKeywords";
import { config, userScripts } from "./LocalStorage";
import { customTabComplete } from "./replCustomizationOverwrite";


// Auto completion

export type CustomCompleterResult = [completions: string[], matchString: string, actualCompletions?: string[], actualMatchString?: string];

let emptyCompl: CompleterResult;

const isObj = (item: any): item is Record<any,any>|Function => {
  const type = typeof item;
  return type === 'object' || type === 'function';
};

const stringPrototypeKeys = Object.getOwnPropertyNames(String.prototype);
const arrayPrototypeKeys = Object.getOwnPropertyNames(Array.prototype);
const functionPrototypeKeys = Object.getOwnPropertyNames(Function.prototype);

interface IObjKeysLookup { [key: string]: {keys: string[], len: number} }
let jsObjKeysLookup: IObjKeysLookup = {};
const setObjKeysLookupVal = (key: string, obj: Record<string,any>|Function): string[] => {
  const keys = Object.keys(obj);
  const allKeysSet = [...new Set([
    ...Object.getOwnPropertyNames(obj),
    ...keys,
    ...Object.keys(Object.getPrototypeOf(obj)),
    ...(typeof obj === 'function' ? functionPrototypeKeys : [])])];
  jsObjKeysLookup[key] = {keys: allKeysSet, len: keys.length};
  return allKeysSet;
};

// objKey can contain dots for nested entries
const getObjectKeys = (objKey: string): string[]|null => {
  // todo: somehow handle e.g. 'blabla'.trim or [12, 34].push like autocompletion
  // if (objKey.charAt(0) === '[')
  //   return arrayPrototypeKeys;
  // if (objKey.charAt(0).match(/"'`/))
  //   return stringPrototypeKeys;

  const valueAtKey = objKey.split('.').reduce((currentObj: Record<string,any>|any, currentKey: string): Record<string,any>|any => {
    if (!currentObj || !isObj(currentObj)) // if it's not an object and you're still trying to get a key in it, fail
      return undefined;
    return currentObj[currentKey];
  }, global);

  const valIsObj = isObj(valueAtKey);

  if (Array.isArray(valueAtKey))
    return arrayPrototypeKeys;
  if (!valIsObj) {
    if (typeof valueAtKey === 'string')
      return stringPrototypeKeys;
    return null;
  }

  const preExistingKeyVals = jsObjKeysLookup[objKey];
  if (preExistingKeyVals) {
    // todo: get hasChanged based on hash of keys or something
    const hasChanged = valIsObj && Object.keys(valueAtKey).length !== preExistingKeyVals.len;
    if (!hasChanged)
      return preExistingKeyVals.keys;
  }

  return setObjKeysLookupVal(objKey, valueAtKey);
};


let inittedKeys = false;
let jsGlobalKeys: string[];
let nodeModuleNames: string[];
const initKeys = () => {
  inittedKeys = true;
  jsGlobalKeys = [...jsKeywords, ...getObjectKeys('global')];
  if (existsSync(process.env.NODE_PATH as string|undefined))
    nodeModuleNames = readdirSync(process.env.NODE_PATH, 'utf8');
};

function completeJs(line: string): CustomCompleterResult {
  if (!inittedKeys) initKeys();

  if (nodeModuleNames) {
    const checkRequireString = line.match(/require\(['"`]([^'"`]*)$/)?.[1];
    if (checkRequireString) {
      return completeCaseIns(checkRequireString, nodeModuleNames);
    }
  }

  // User input is read from a space or opening bracket or some other character
  const [, checkString] = line.match(/(?:[ \(\[{!?=,]|\.\.\.)?([^ \(\[{!?=,]*)$/) ?? [];
  if (!checkString)
    return emptyCompl;

  const [objKeyMatch, objKey, objSubKey] = (checkString.match(/([\w\.]+)\.(\w*)$/) ?? []);
  // console.llog('complete js', objKeyMatch, objKey, objSubKey, jsGlobalKeyValues[objKey])
  if (!objKeyMatch)
    // Defined variables will only show up in global when you initialized them with `var`
    return completeCaseIns(checkString, [...new Set([...Object.keys(global), ...jsGlobalKeys])]);

  const keyValues = getObjectKeys(objKey);
  if (keyValues)
    return completeCaseIns(objSubKey, keyValues);

  return emptyCompl;
   // todo: even better autocompletion interwoven through javascript? (parse with acorn)
}

function completeCaseIns(stringToCheck: string, completions: string[]|Record<string,any>): CustomCompleterResult {
  const completionsArray = Array.isArray(completions) ? completions : Object.keys(completions);
  const checkRegex = new RegExp(`^${escapeRegex(stringToCheck)}`, 'i');
  const actualCompletions = completionsArray.filter(c => c.match(checkRegex));
  // console.llog('completion case ins', stringToCheck, completionsArray, actualCompletions);
  if (!actualCompletions.length)
    return emptyCompl;
  let trimmedCompletions = actualCompletions.map(c => c.slice(stringToCheck.length));
  // This is done because from node 14, if you press enter it does the autocomplete directly.
  // So we can't just filter out the empty string.
  if (trimmedCompletions.includes(''))
    trimmedCompletions = [];
  return [ trimmedCompletions, '', actualCompletions, stringToCheck ];
}

function getCompletionData(line: string): CustomCompleterResult {
  emptyCompl = [ [], line ] as CompleterResult;
  if (!line.startsWith('.'))
    return completeJs(line);

  const [cmdMatch, cmdName, space] = getCommand(line);
  if (!space || !r.commands[cmdName]) {
    if (!cmdName)
      return emptyCompl;

    return completeCaseIns(cmdName, r.commands);
  }

  const {renderOpts, optsValues} = (cmdInfo[cmdName] || {});
  // Assuming you put only one character between opt and value
  const typingOption = line.match(/--(\w*)([= ]\w*)?$/);
  if (typingOption && renderOpts) {
    const [typOptMatch, typOptName, typOptFromEquals] = typingOption;
    // console.llog('slice', typingOption.index, typOptName, typOptName.length, line, line.slice(typingOption.index+typOptName.length+1))
    if (typOptFromEquals)
      return completeCaseIns(line.slice(typingOption.index+typOptName.length+2+1), optsValues?.[typOptName] ?? []);
    return completeCaseIns(line.slice(typingOption.index), [...renderOpts, '--help']);
  }

  const lineAfterCommand = line.slice(cmdMatch.length);
  const [args, opts] = parseArgs(lineAfterCommand, cmdInfo[cmdName]);

  const typingOptsPart = (lineAfterCommand.startsWith('-') && !args.length) || (args.length && Object.keys(opts).filter(o => opts[o] !== false).length);
  if (typingOptsPart)
    return emptyCompl;

  const lastArg = args[args.length-1] ?? '';
  const nthArg = args.length || 1;

  if ((cmdName.match(/^userscript(?:[GS]et)?/) || cmdName === 'u') && nthArg===1)
    return completeCaseIns(lastArg, userScripts.s);
  if (cmdName.match(/^userscriptDelete/))
    return completeCaseIns(lastArg, userScripts.s);
  if (cmdName.match(/^config[GS]et/) && nthArg===1)
    return completeCaseIns(lastArg, config.s);
  if (cmdName === 'helpp')
    return completeCaseIns(lastArg, r.commands);
  if (cmdName.match(/^(?:cd|mkdir|rename|metadata|setTags|copy|move|load(?:Script)?|scr)$/) && nthArg===1 || cmdName.match(/copy|move/) && nthArg<=2) {
    const dirLine = lastArg.charAt(0).match(/["'`]/) ? lastArg.slice(1) : lastArg;
    const items = cmdName.match(/loadScript|scr/)
      ? [...ENV.currentDirItems.filter(i => i.match(/\.[jt]s$/)), ...ENV.extraScriptsDirItems]
      : ENV.currentDirItems
    return completeCaseIns(dirLine, items);
  }

  // Assuming that in most cases you're going to want javascript-like things after you command
  return completeJs(lineAfterCommand);
}

export const completer: Completer = (line: string) => {
  const [completions, matchString, actualCompletions, actualMatchString] = getCompletionData(line);
  const hits = completions.filter((c) => c.startsWith(matchString));
  return [hits, matchString, actualCompletions, actualMatchString] as unknown as [string[], string];
}


// Syntax highlighting

function parseClasses(classNames?: string[]): [classes?: string[], language?: string] {
  if (!classNames) return [];

  let language: string;
  const classes = classNames.filter(c => {
    // A text node which is a certain language (e.g. "regex") will have the classes: "regex-source" and "language-regex"
    if (c.startsWith('language-') || c.endsWith('-source')) {
      language = c.match(/^language-(\w+)$/)?.[1] ?? c.match(/^(\w+)-source$/)?.[1];
      if (!language) console.error('Language not found this is weird!', classNames);
      return false;
    }
    return !(c === 'token'); // Can add more conditions hyah
  });
  return [classes, language];
}

function parseHighlightNode(node: refractor.RefractorNode, lang: string, classNames?: string[], parentHighlights: IHighlightLookup = defaultHighlightLookup): string {
  const highlights = languageSpecificHighlightLookup[lang] || parentHighlights;

  if (node.type === 'element') // This element has nested element children, or (usually just 1) text children with the classes on this element node
    return node.children.map(c => parseHighlightNode(c, lang, node.properties.className, highlights)).join('');

  // It is a text node from here on, end of tree branch.

  const [classes, language] = parseClasses(classNames);
  if (language) return highlight(node.value, language);

  if (!classes?.length) // This text node needs no special highlighting
    return highlights._(node.value);

  // Wrap the effects each class has on the text around one another
  return classes.reduce((str, className) => {
    const ch = highlights[className];
    if (ch) return ch(str);
    console.plog(`Unknown highlight class: "${className}". Val: "${str}"`);
    return str;
  }, node.value);
};

export function highlight(part: string, lang: string): string {
  return refractor.highlight(part, lang)
    .map(c => parseHighlightNode(c, lang))
    .join('');
}

class ResultBuilder {
  public result: string = '';
  constructor(public l: string) {}
  public eatFromInput(howMuchToEat: number, addToResult: string) {
    this.result += addToResult;
    this.l = this.l.slice(howMuchToEat);
  }
}

export function highlightLine(line: string): string {
  const b = new ResultBuilder(line);

  const [cmdMatch, cmdName] = getCommand(b.l);
  if (b.l.startsWith('.')) {
    if (!cmdMatch) return line;
    b.eatFromInput(cmdMatch.length, b.l.slice(0, cmdMatch.length))
  } else {
    return b.result + highlight(b.l, 'js');
  }

  const drawBody = (part: string): string => {
    const p = new ResultBuilder(part);
    if (cmdName === 'renameEachRx') {
      const [arg1Match, quote1, actualRegex, quote2] = matchString(p.l) ?? p.l.match(/^(\/)([^\/]+)(\/?)/) ?? p.l.match(/^()(\S+)()/) ?? [];
      if (arg1Match) {
        if (quote1) p.eatFromInput(1, chalk.red(quote1));
        p.eatFromInput(actualRegex.length, highlight(p.l.slice(0, actualRegex.length), 'regex'));
        if (quote2) p.eatFromInput(1, chalk.red(quote2));
      }
    }
    return p.result + highlight(p.l, 'js');
  };

  const drawOptions = (part: string): string => {
    // todo: possibly more accurate custom highlighting?
    return highlight(part, 'bash');
  };

  const drawPart = (part: string, drawer: (part: string) => string) => {
    const output = drawer(part);
    b.eatFromInput(part.length, output);
  } 

  const [optsReverse, part1, part2] = splitArgsString(b.l, cmdInfo[cmdName]);
  if (optsReverse) {
    drawPart(part1, drawOptions);
    drawPart(part2, drawBody);
  } else {
    drawPart(part1, drawBody);
    drawPart(part2, drawOptions);
  }

  return b.result;
}

// Variation on Interface._refreshLine, to facilitate syntax highlighting
function /*REPLServer.*/replaceCurrentLine(replaceBy: string) {
  const line = this._prompt + replaceBy;
  const dispPos = this._getDisplayPos(line);
  const lineCols = dispPos.cols;
  const lineRows = dispPos.rows;

  const cursorPos = this.getCursorPos();
  
  const prevRows = this.prevRows || 0;
  if (prevRows > 0)
    moveCursor(this.output, 0, -prevRows);

  cursorTo(this.output, 0);
  // (commented this out because it kills the preview completion stuff?)
  // clearScreenDown(this.output);
  this._writeToOutput(line);

  if (lineCols === 0)
    this._writeToOutput(' ');

  cursorTo(this.output, cursorPos.cols);
  
  const diff = lineRows - cursorPos.rows;
  if (diff > 0)
    moveCursor(this.output, 0, -diff);

  this.prevRows = cursorPos.rows;
}

export function setupReplCustomization(r: REPLServer) {
  process.stdin.on('keypress', (c, k) => {
    if (!config.s.syntaxHighlighting) return;

    if (c !== "\"\\u0003\"" && c !== "\"\\r\"") {
      const edited = highlightLine(r.line);
      r._replaceCurrentLine(edited);
    }
  });

  r._replaceCurrentLine = replaceCurrentLine;

  r._tabComplete = customTabComplete;
}
