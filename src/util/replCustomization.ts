import { CompleterResult, cursorTo } from "readline";
import refractor, { RefractorNode } from "refractor";
import { REPLServer } from "repl";
import { ExtendedREPLCommand, r } from "..";
import highlightLookup from "../highlightLookup";
import { config, logger, userScripts } from "./LocalStorage";

export function completer(line: string): CompleterResult {
  let completions: string[] = [];
  let matchString = line;

  if (line.startsWith('.')) {
    const [cmdMatch, cmdName] = line.match(/^\.([\w-]+) +/) ?? [];
    if (cmdName && r.commands[cmdName]) {
      const {opts, optsValues} = r.commands[cmdName] as ExtendedREPLCommand;
      // console.log(JSON.stringify(commandData))
      const typingOption = line.match(/(--\w*)([= ]\w*)?$/);
      if (typingOption && opts) {
        const [typOptMatch, typOptName, typOptFromEquals] = typingOption;
        if (typOptFromEquals) {
          completions = optsValues[typOptName] ?? [];
          matchString = line.slice(typingOption.index+typOptName.length+1); // Assuming you put only one character between opt and value
        } else {
          completions = opts;
          matchString = line.slice(typingOption.index);
        }
      } else if (cmdName.match(/^userscript(?:-(get|set|delete))/)) {
        completions = Object.keys(userScripts.s);
        matchString = line.slice(cmdMatch.length);
      } else if (cmdName.match(/^config-[gs]et/)) {
        completions = Object.keys(config.s);
        matchString = line.slice(cmdMatch.length);
      } else if (cmdName === 'help') {
        completions = Object.keys(r.commands);
        matchString = line.slice(4+1+1);
      }
    } else {
      completions = Object.keys(r.commands);
      matchString = line.slice(1);
    }
  }

  const hits = completions.filter((c) => c.startsWith(matchString));
  return [hits, matchString];
}


// Syntax highlighting

function parseHighlightNode(node: RefractorNode, classNames: string[] = []): string {
  if (node.type === 'element')
    return node.children.map(c => parseHighlightNode(c, node.properties.className)).join('');

  let val = node.value;
  classNames.forEach(className => {
    if (className === 'token') return;
    const ch = highlightLookup[className];
    if (ch) val = ch(val);
    else logger.log('unknown highlight class:', className);
  });
  return val;
};

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
        const hlLine = refractor.highlight(rr.line, 'js')
          .map(c => parseHighlightNode(c))
          .join('');
        rr._refreshCurrentLine(hlLine);
      }, 0);
    }
  });

  rr._refreshCurrentLine = refreshCurrentLine;
}
