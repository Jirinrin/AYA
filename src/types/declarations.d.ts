export declare module 'repl' {
  interface REPLServer {
    history: string[];
    line: string;
    _refreshCurrentLine(editedLine: string): void;
    _tabComplete(lastKeypressWasTab: boolean): void;
  }
}
