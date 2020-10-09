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
    fs.writeFileSync(this.jsonPath, JSON.stringify(this.state), 'utf8');
  }

  public set<K extends keyof T>(key: K, val: T[K]) {
    this.state[key] = val;
    this.writeState();
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
}

export const config = new Config();
export const userScripts = new UserScripts();
