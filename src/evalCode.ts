import chalk from "chalk";
import { REPLServer } from "repl";

export const globalEval = eval;

export function evall(func: Function, r: REPLServer) {
  return (args: string) => {
    try {
      const argsArray = 
        args
          .split(',,')
          .map(arg => globalEval(arg));
      func(...argsArray);
      r.clearBufferedCommand(); // Doesn't seem to do much
    } catch (err) {
      console.error('An error occurred:', err);
    }
  };
}


let codeBuilder = '';
export function executeCode(code: string, r: REPLServer) {
  if (!code || code.startsWith('.') || code.startsWith('console')) return;

  console.log(chalk.blueBright('got code:', `"${code}"`));
  if (code.startsWith('... ')) {
    codeBuilder += `${code.slice(4)}\n`;
  } else {
    codeBuilder += `${code}`
    console.log(chalk.greenBright('code built up to:', `"${codeBuilder}"`));
    try {
      globalEval(codeBuilder);
    } catch (err) {
      console.error(
        chalk.red('Error trying to eval:'),
        chalk.magenta(`${codeBuilder}`),
        chalk.red(`Error: "${err}"`),
      );
    }
    codeBuilder = '';
  }
}

