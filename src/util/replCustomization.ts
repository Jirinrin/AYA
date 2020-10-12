import * as chalk from "chalk";
import { Completer, CompleterResult, cursorTo } from "readline";
import * as refractor from "refractor";
import { REPLServer } from "repl";
import { r } from "..";
import { cmdInfo } from "../modules";
import highlightLookup from "./highlightLookup";
import { config, userScripts } from "./LocalStorage";
import { customTabComplete } from "./replCustomizationOverwrite";

const getCommand = (line: string) =>
  (line.match(/^\.([\w-]+)( +)?/) ?? []) as [cmdMatch?: string, cmdName?: string, space?: string];


// Auto completion

export type CustomCompleterResult = [completions: string[], matchString: string, actualCompletions?: string[], actualMatchString?: string];

let emptyCompl: CompleterResult;

const jsGlobalObjects: [string, object][] = [
  ['Object', Object], ['Array', Array], ['String', String], ['console', console], ['JSON', JSON]
]
const jsGlobalWords = ['var', 'blarn'];
let jsGlobalKeys: string[];
let jsGlobalKeyValues: Record<string, string[]>;
const setJsGlobalKeys = () => {
  jsGlobalKeys = [
    ...jsGlobalObjects.map(([key]) => key),
    ...jsGlobalWords,
  ];
  jsGlobalKeyValues = jsGlobalObjects.reduce((acc, [key, obj]) => ({
    ...acc,
    [key]: key.match(/^[A-Z]/) ? Object.getOwnPropertyNames(obj) : Object.keys(obj),
  }), {});
};

function completeJs(line: string): CustomCompleterResult {
  if (!jsGlobalKeys) setJsGlobalKeys();

  const checkString = line.slice(line.lastIndexOf(' ')+1);
  const [objKeyMatch, objKey, objSubKey] = (checkString.match(/(\w+)\.(\w*)/) ?? []);
  console.llog('something', line, checkString, objKeyMatch, objKey, objSubKey);
  if (!objKeyMatch)
    // Defined variables will only show up in global when you initialized them with `var`
    return completeCaseIns(checkString, [...Object.keys(global), ...jsGlobalKeys]);
  
  if (jsGlobalKeyValues[objKey])
    return completeCaseIns(objSubKey, jsGlobalKeyValues[objKey])

  return emptyCompl;
   // todo: even better autocompletion interwoven through javascript? (parse with acorn) or at least some common keywords
}

function completeCaseIns(stringToCheck: string, completions: string[]|Record<string,any>): CustomCompleterResult {
  const completionsArray = Array.isArray(completions) ? completions : Object.keys(completions);
  const checkRegex = new RegExp(`^${escapeRegex(stringToCheck)}`, 'i');
  const actualCompletions = completionsArray.filter(c => c.match(checkRegex));
  // global.log('completion case ins', stringToCheck, completionsArray, actualCompletions);
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

  const {renderOpts, optsValues} = cmdInfo[cmdName];
  // Assuming you put only one character between opt and value
  const typingOption = line.match(/--(\w*)([= ]\w*)?$/);
  if (typingOption && renderOpts) {
    const [typOptMatch, typOptName, typOptFromEquals] = typingOption;
    // global.log('slice', typingOption.index, typOptName, typOptName.length, line, line.slice(typingOption.index+typOptName.length+1))
    if (typOptFromEquals)
      return completeCaseIns(line.slice(typingOption.index+typOptName.length+2+1), optsValues[typOptName] ?? []);
    return completeCaseIns(line.slice(typingOption.index), [...renderOpts, '--help']);
  }

  if (cmdName.match(/^userscript(?:-(get|set|delete))?/))
    return completeCaseIns(line.slice(cmdMatch.length), userScripts.s);
    if (cmdName.match(/^config-[gs]et/))
    return completeCaseIns(line.slice(cmdMatch.length), config.s);
    if (cmdName === 'helpp')
    return completeCaseIns(line.slice(cmdMatch.length), r.commands);

  return emptyCompl;
}

export const completer: Completer = (line: string) => {
  const [completions, matchString, actualCompletions, actualMatchString] = getCompletionData(line);
  const hits = completions.filter((c) => c.startsWith(matchString));
  return [hits, matchString, actualCompletions, actualMatchString] as unknown as [string[], string];
}


// Syntax highlighting

function parseHighlightNode(node: refractor.RefractorNode, classNames: string[] = [], defaultChalk: chalk.Chalk = chalk): string {
  if (node.type === 'element')
    return node.children.map(c => parseHighlightNode(c, node.properties.className)).join('');

  let val = node.value;
  classNames.forEach(className => {
    if (className === 'token' || className.startsWith('language-')) // todo?: maybe some system with language specific class overwrites?
      return;
    const ch = highlightLookup[className];
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

export function highlightLine(line: string): string {
  let l = line;
  let result = '';
  const eatFromLine = (howMuchToEat: number, addToResult: string) => {
    result += addToResult;
    l = l.slice(howMuchToEat);
  };

  const [cmdMatch, cmdName] = getCommand(l);
  if (l.startsWith('.')) {
    if (!cmdMatch) return line;
    result += l.slice(0, cmdMatch.length);
    l = l.slice(cmdMatch.length);
  }

  if (cmdName === 'eer-rx') {
    const [arg1Match, quote1, actualRegex, quote2] = l.match(/^(")([^"]+)("?)/) ?? l.match(/^(')([^']+)('?)/) ?? l.match(/^(\/)([^\/]+)(\/?)/) ?? l.match(/^(`)([^`]+)(`?)/) ?? l.match(/^()(\S+)()/) ?? [];
    if (arg1Match) {
      if (quote1) eatFromLine(1, chalk.red(quote1));
      eatFromLine(actualRegex.length, highlight(l.slice(0, actualRegex.length), 'regex'));
      if (quote2) eatFromLine(1, chalk.red(quote2));
    }
  }

  const optionsMatch = l.match(/--.*$/);
  if (!optionsMatch) {
    return result + highlight(l, 'js');
  }

  eatFromLine(optionsMatch.index, highlight(l.slice(0, optionsMatch.index), 'js'));

  return result + highlight(l, 'bash');
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
  const rr = r as any;

  process.stdin.on('keypress', (c, k) => {
    if (!config.s.syntaxHighlighting) return;

    if (c !== "\"\\u0003\"" && c !== "\"\\r\"") {
      // todo: remove timeout?
      setTimeout(() => {
        const edited = highlightLine(rr.line);
        // global.log('yo', rr.line, '|||', edited);
        rr._refreshCurrentLine(edited);
      }, 0);
    }
  });

  rr._refreshCurrentLine = refreshCurrentLine;

  rr._tabComplete = customTabComplete;
}
