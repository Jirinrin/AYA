import * as fs from 'fs';
import * as path from 'path';

const defaultConfig = {
  recursionDepth: 3,
}
type IConfig = typeof defaultConfig;

type UserScript = string;
type IUserScripts = Record<string, UserScript>;


class LocalStorage<T extends Record<string, any>> {
  protected jsonPath: string;
  protected state: T;

  public get s() { return this.state };

  constructor(fileName: string, initState: T) {
    const dir = path.resolve('./.ayaStorage');
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir);
    
    this.jsonPath = path.resolve(dir, fileName);
    if (!fs.existsSync(this.jsonPath))
      fs.writeFileSync(this.jsonPath, JSON.stringify(initState), 'utf8');

    this.readState();
  }

  protected readState() {
    this.state = JSON.parse(fs.readFileSync(this.jsonPath).toString());
  }

  protected writeState() {
    fs.writeFileSync(this.jsonPath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  public set<K extends keyof T>(key: K, val: T[K]) {
    this.state[key] = val;
    this.writeState();
    console.info(`Successfully set item with key "${key}"!`);
  }
}


class Config extends LocalStorage<IConfig> {
  constructor() {
    super('settings.json', defaultConfig);
  }
}

class UserScripts extends LocalStorage<IUserScripts> {
  constructor() {
    super('scripts.json', {});
  }

  public getKeysString(): string {
    return Object.keys(this.state).join(", ");
  }

  private keyExists(key: string): boolean {
    if (!this.state[key]) {
      console.warn(`Script with key "${key}" was not found`);
      return false;
    }
    return true;
  }

  public getScript(key: string): UserScript | null {
    return this.keyExists(key) ? this.state[key] : null;
  }

  public delete(key: string) {
    if (!this.keyExists(key)) return;

    // todo: ask if you're sure, show content of script once more
    delete this.state[key];
    this.writeState();
    console.info(`Successfully deleted item with key ${key}`);
  }
}

class Logger extends LocalStorage<Array<any>> {
  constructor() {
    super('log.json', []);
  }

  public log(...message: any[]) {
    this.state.push(message.join(' '));
    this.writeState();
  }
}

export const config = new Config();
export const userScripts = new UserScripts();
export const logger = new Logger();
