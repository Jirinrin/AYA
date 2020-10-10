import chalk, { Chalk } from "chalk";

// todo: better color scheme (can use chalk.hex()?) https://github.com/dracula/prism
// todo: include all kinds of regex related keywords: 'language-regex', 'regex-delimiter', 'quantifier', 'group', 'charclass'

const highlights: [string[], Chalk][] = [
  [["property", "tag", "boolean", "number", "constant", "symbol", "deleted", "regex-delimiter"], chalk.red], // #905

  [["selector", "attr-name", "string", "char", "builtin", "inserted"], chalk.yellow], // #690

  [["operator", "entity", "url", "string"], chalk.green], // #9a6e3a

  [["atrule", "attr-value", "keyword"], chalk.blue], // #07a

  [["function", "class-name"], chalk.cyan], // #DD4A68

  [["regex", "important", "variable"], chalk.cyan], // #e90

  [["punctuation"], chalk ], // #fff

  [["italic"], chalk.italic],

  [["bold", "important"], chalk.bold],
];

const highlightLookup: Record<string, Chalk> = {};
highlights.forEach(([classes, color]) => classes.forEach(c => highlightLookup[c] = color));

export default highlightLookup;
