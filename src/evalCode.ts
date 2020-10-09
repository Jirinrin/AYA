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
