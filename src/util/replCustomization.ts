import * as chalk from "chalk";
import { CompleterResult, cursorTo } from "readline";
import * as refractor from "refractor";
import { REPLServer } from "repl";
import { ExtendedREPLCommand, r } from "..";
import highlightLookup from "./highlightLookup";
import { config, userScripts } from "./LocalStorage";

const getCommand = (line: string) =>
  (line.match(/^\.([\w-]+) +/) ?? []) as [cmdMatch?: string, cmdName?: string];

function getCompletionData(line: string): [completions: string[], matchString: string] {
  if (!line.startsWith('.'))
    return [ [], line ];

  const [cmdMatch, cmdName] = getCommand(line);
  if (!cmdName || !r.commands[cmdName])
    return [ Object.keys(r.commands), line.slice(1) ];

  const {opts, optsValues} = r.commands[cmdName] as ExtendedREPLCommand;
  const typingOption = line.match(/(--\w*)([= ]\w*)?$/);
  if (typingOption && opts) {
    const [typOptMatch, typOptName, typOptFromEquals] = typingOption;
    if (typOptFromEquals) {
      return [
        optsValues[typOptName] ?? [], 
        line.slice(typingOption.index+typOptName.length+1) // Assuming you put only one character between opt and value
      ];
    }
    return [ opts, line.slice(typingOption.index) ];
  }

  if (cmdName.match(/^userscript(?:-(get|set|delete))/))
    return [ Object.keys(userScripts.s), line.slice(cmdMatch.length) ];
  if (cmdName.match(/^config-[gs]et/))
    return [ Object.keys(config.s),      line.slice(cmdMatch.length) ];
  if (cmdName === 'helpp')
    return [ Object.keys(r.commands),    line.slice(cmdMatch.length) ];

  return [ [], line ];
}

export function completer(line: string): CompleterResult {
  const [completions, matchString] = getCompletionData(line);
  const hits = completions.filter((c) => c.startsWith(matchString));
  return [hits, matchString];
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
    else global.pLog(`unknown highlight class: ${className}. Val: ${val}`);
  });
  return val;
};

function highlightPart(part: string, lang: string): string {
  return refractor.highlight(part, lang)
    .map(c => parseHighlightNode(c))
    .join('');
}

function highlightLine(line: string): string {
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
      eatFromLine(actualRegex.length, highlightPart(l.slice(0, actualRegex.length), 'regex'));
      if (quote2) eatFromLine(1, chalk.red(quote2));
    }
  }

  const optionsMatch = l.match(/--.*$/);
  if (!optionsMatch) {
    return result + highlightPart(l, 'js');
  }

  eatFromLine(optionsMatch.index, highlightPart(l.slice(0, optionsMatch.index), 'js'));

  return result + highlightPart(l, 'bash');
}

// Bare bones variation on Interface._refreshLine, to facilitate syntax highlighting
function /*REPLServer.*/refreshCurrentLine(input: string) {
  const line = this._prompt + input;
  const cursorPos = this.getCursorPos();
  cursorTo(this.output, 0);
  this._writeToOutput(line);
  cursorTo(this.output, cursorPos.cols);
}

export function setupSyntaxHighlighting(r: REPLServer) {
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
}
