export declare module 'repl' {
  interface REPLServer {
    history: string[];
    line: string;
    _replaceCurrentLine(replaceBy: string): void;
    _tabComplete(lastKeypressWasTab: boolean): void;
  }
}

declare global {
  namespace NodeJS {
    interface Process {
      pkg?: {
        entrypoint: string;
        defaultEntrypoint: string;
        path: { resolve: Function };
        mount: Function;
      };
    }
  }
}
