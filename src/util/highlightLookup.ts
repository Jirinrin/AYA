import * as chalk from "chalk";

// Based on https://github.com/dracula/prism

// const originalColors = {
//   '--foreground': '#F8F8F2',
//   '--comment':    '#6272A4',
//   '--cyan':       '#8BE9FD',
//   '--green':      '#50FA7B',
//   '--orange':     '#FFB86C',
//   '--pink':       '#FF79C6',
//   '--purple':     '#BD93F9',
//   '--red':        '#FF5555',
//   '--yellow':     '#F1FA8C',
//   not sure        '#e2777a',
// }

// todo: in regex make e.g. unescaped ) the default color
const highlights: [string[], chalk.Chalk][] = [
  [['script', 'prolog', 'punctuation', 'charset', 'interpolation'], chalk], // --foreground
  [['comment', 'variable'], chalk.gray], // --comment
  [['url', 'built-in', 'class-name', 'maybe-class-name', 'console', 'charset-punctuation', 'property-access', 'property'], chalk.cyan], // --cyan
  [['atrule', 'attr-name', 'attr-value', 'function', 'method', 'function-variable'], chalk.greenBright], // --green
  [['parameter' /*should be italic*/, 'group', 'symbol'], chalk.hex('#FFB86C')], // --orange
  [['entity', 'keyword', 'important', 'selector', 'tag', 'operator', 'arrow', 'alternation', 'quantifier', 'escape', 'special-escape', 'anchor', 'interpolation-punctuation'], chalk.magentaBright], // --pink
  [['boolean', 'constant', 'number', 'charclass', 'known-class-name', 'null', 'nil', 'range-punctuation', 'range'], chalk.magenta], // --purple
  [['regex', 'regex-delimiter', 'charset-negation'], chalk.red], // --red
  [['string', 'char', 'template-punctuation'], chalk.yellowBright], // --yellow

  // not sure: 'inserted', 'deleted', 'namespace'

  [['italic'], chalk.italic],
  [["bold", "important"], chalk.bold],
];

const highlightLookup: Record<string, chalk.Chalk> = {};
highlights.forEach(([classes, color]) => classes.forEach(c => highlightLookup[c] = color));

export default highlightLookup;
