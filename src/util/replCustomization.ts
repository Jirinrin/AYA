import * as chalk from "chalk";
import { Completer, CompleterResult, cursorTo } from "readline";
import * as refractor from "refractor";
import { REPLServer } from "repl";

import { r } from "..";
import ENV from "../ENV";
import { cmdInfo, getCommand } from "../modules";
import { escapeRegex, parseArgs, splitArgsString } from "./generalUtils";
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

interface IObjKeysLookup { [key: string]: {keys: string[], len: number} }
let jsObjKeysLookup: IObjKeysLookup = {};
const setObjKeysLookupVal = (key: string, obj: Record<string,any>|Function): string[] => {
  const keys = Object.keys(obj);
  const allKeysSet = [...new Set([...Object.getOwnPropertyNames(obj), ...keys])];
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
      return null;
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


let inittedJsGlobalKeys = false;
let jsGlobalKeys: string[];
const setJsGlobalKeys = () => {
  inittedJsGlobalKeys = true;
  jsGlobalKeys = [...jsKeywords, ...getObjectKeys('global')];
};

function completeJs(line: string): CustomCompleterResult {
  if (!inittedJsGlobalKeys) setJsGlobalKeys();

  // User input is read from a space or opening bracket
  const [_, checkString] = line.match(/[ \(\[{]?([^ \(\[{]*)$/) ?? [];
  if (!checkString)
    return emptyCompl;

  const [objKeyMatch, objKey, objSubKey] = (checkString.match(/([\w\.]+)\.(\w*)$/) ?? []);
  // console.llog('complete js', objKeyMatch, objKey, objSubKey, jsGlobalKeyValues[objKey])
  if (!objKeyMatch) {
    // Defined variables will only show up in global when you initialized them with `var`
    return completeCaseIns(checkString, [...Object.keys(global), ...jsGlobalKeys]);}

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
  const trimmedCompletions = actualCompletions.map(c => c.slice(stringToCheck.length)).filter(c => !!c);
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

  if ((cmdName.match(/^userscript(?:-(get|set))?/) || cmdName === 'u') && nthArg===1)
    return completeCaseIns(lastArg, userScripts.s);
  if (cmdName.match(/^userscript-delete/))
    return completeCaseIns(lastArg, userScripts.s);
  if (cmdName.match(/^config-[gs]et/) && nthArg===1)
    return completeCaseIns(lastArg, config.s);
  if (cmdName === 'helpp')
    return completeCaseIns(lastArg, r.commands);
  if (cmdName.match(/cd|mkdir|rename|metadata|setTags|copy|move/) && nthArg===1 || cmdName.match(/copy|move/) && nthArg<=2) {
    const dirLine = lastArg.charAt(0).match(/["'`]/) ? lastArg.slice(1) : lastArg;
    return completeCaseIns(dirLine, ENV.currentDirItems);
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

function parseClasses(classNames: string[]): [classes: string[], language?: string] {
  let language: string;
  const classes = classNames.filter(c => {
    if (c.startsWith('language-')) {
      language = c;
      return false;
    }
    return !(c === 'token'); // Can add more conditions hyah
  });
  return [classes, language];
}

function parseHighlightNode(node: refractor.RefractorNode, classNames: string[] = [], parentHighlights: IHighlightLookup = defaultHighlightLookup): string {
  const [classes, language] = parseClasses(classNames);

  const highlights = (language && languageSpecificHighlightLookup[language]) || parentHighlights;

  if (node.type === 'element')
    return node.children.map(c => parseHighlightNode(c, node.properties.className, highlights)).join('');

  if (!classes.length) return highlights._(node.value);

  let val = node.value;
  classes.forEach(className => {
    const ch = highlights[className];
    if (ch) val = ch(val);
    else console.plog(`unknown highlight class: ${className}. Val: ${val}`);
  });
  return val;
};

export function highlight(part: string, lang: string): string {
  return refractor.highlight(part, lang)
    .map(c => parseHighlightNode(c))
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
    if (cmdName === 'renameEach-rx') {
      const [arg1Match, quote1, actualRegex, quote2] = p.l.match(/^(")([^"]+)("?)/) ?? p.l.match(/^(')([^']+)('?)/) ?? p.l.match(/^(\/)([^\/]+)(\/?)/) ?? p.l.match(/^(`)([^`]+)(`?)/) ?? p.l.match(/^()(\S+)()/) ?? [];
      if (arg1Match) {
        if (quote1) p.eatFromInput(1, chalk.red(quote1));
        p.eatFromInput(actualRegex.length, highlight(p.l.slice(0, actualRegex.length), 'regex'));
        if (quote2) p.eatFromInput(1, chalk.red(quote2));
      }
    }
    return p.result + highlight(p.l, 'js');
  };

  const drawOptions = (part: string): string => {
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

// Bare bones variation on Interface._refreshLine, to facilitate syntax highlighting
function /*REPLServer.*/refreshCurrentLine(input: string) {
  const line = this._prompt + input;
  const cursorPos = this.getCursorPos();
  cursorTo(this.output, 0);
  this._writeToOutput(line);
  cursorTo(this.output, cursorPos.cols);
}

export function setupReplCustomization(r: REPLServer) {
  process.stdin.on('keypress', (c, k) => {
    if (!config.s.syntaxHighlighting) return;

    if (c !== "\"\\u0003\"" && c !== "\"\\r\"") {
      // todo: remove timeout?
      setTimeout(() => {
        const edited = highlightLine(r.line);
        // console.llog('yo', rr.line, '|||', edited);
        r._refreshCurrentLine(edited);
      }, 0);
    }
  });

  r._refreshCurrentLine = refreshCurrentLine;

  r._tabComplete = customTabComplete;
}
