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

const defaultHighlights: [string[], chalk.Chalk][] = [
  [['script', 'prolog', 'punctuation', 'charset', 'interpolation', 'char-class', 'literal-property'], chalk], // --foreground
  [['comment', 'variable'], chalk.gray], // --comment
  [['url', 'built-in', 'builtin', 'class-name', 'maybe-class-name', 'console', 'charset-punctuation', 'property-access', 'property', 'char-class-punctuation'], chalk.cyan], // --cyan
  [['atrule', 'attr-name', 'attr-value', 'function', 'method', 'function-variable'], chalk.greenBright], // --green
  [['parameter' /*should be italic*/, 'group', 'symbol', 'method-variable'], chalk.hex('#FFB86C')], // --orange
  [['entity', 'keyword', 'important', 'selector', 'tag', 'operator', 'arrow', 'alternation', 'quantifier', 'escape', 'special-escape', 'anchor', 'interpolation-punctuation', 'module', 'regex-flags', 'spread', 'backreference'], chalk.magentaBright], // --pink
  [['boolean', 'constant', 'number', 'char-set', 'known-class-name', 'null', 'nil', 'range-punctuation', 'range'], chalk.magenta], // --purple
  [['regex', 'regex-delimiter', 'charset-negation', 'char-class-negation', 'control-flow'], chalk.red], // --red
  [['string', 'char', 'template-punctuation'], chalk.yellowBright], // --yellow

  // not sure: 'inserted', 'deleted', 'namespace'

  [['italic'], chalk.italic],
  [['bold', 'important'], chalk.bold],
];

const languageSpecificHighlights: Record<string, typeof defaultHighlights> = {
  'regex': [
    [['_', 'escape', 'special-escape', 'charset'], chalk],
  ],
};

export type IHighlightLookup = Record<string, chalk.Chalk> & {_: chalk.Chalk};
const toLookup = (h: typeof defaultHighlights): Record<string, chalk.Chalk> => Object.fromEntries( h.flatMap(([colors, ch]) => colors.map(c => [c, ch])) );

export const defaultHighlightLookup: IHighlightLookup = {_: chalk, ...toLookup(defaultHighlights)};

export const languageSpecificHighlightLookup: Record<string, IHighlightLookup> = {};

Object.entries(languageSpecificHighlights).forEach(([k, lookupArr]) => {
  const newLookup = toLookup(lookupArr);
  languageSpecificHighlightLookup[k] = {
    ...defaultHighlightLookup,
    ...newLookup,
  };
});
