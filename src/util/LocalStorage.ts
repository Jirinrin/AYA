import * as fs from 'fs';
import { JSONSchema7 } from 'json-schema';
import * as path from 'path';
import * as Ajv from 'ajv';
import * as moment from 'moment'; // todo: do I really need moment for this? (no! At least use luxon)
import { cloneDeep } from 'lodash';
import { getHashCode, highlightExp, readJson, recordToSchema, writeJson } from './generalUtils';
import { ayaStorageDir } from './localUtils';

class LocalStorage<T extends Record<string, any> = any> {
  protected filePath: string;
  protected state: T;

  public get s() { return this.state };

  protected dontWrite = false;

  constructor(fileName: string, initState: T, reset = false) {
    if (!fs.existsSync(ayaStorageDir))
      fs.mkdirSync(ayaStorageDir);
    
    this.filePath = path.resolve(ayaStorageDir, fileName);
    if (!fs.existsSync(this.filePath) || reset)
      this.initFile(initState);

    this.readState();
  }

  public getKeysString(): string {
    return Object.keys(this.state).join(", ");
  }

  protected readState() {
    this.state = readJson(this.filePath);
  }

  protected initFile(initState: T) {
    this.state = initState;
    this.writeState();
  }

  protected writeState() {
    if (!this.dontWrite)
      writeJson(this.filePath, this.state, false);
  }

  public get<K extends keyof T>(key: K): T[K] {
    return cloneDeep(this.state[key]);
  }

  public set<K extends keyof T>(key: K, val: T[K]): boolean {
    if (JSON.stringify(this.state[key]) === JSON.stringify(val) && this.state[key] === val) {
      console.warn('Nothing changed.');
      return false;
    }
    this.state[key] = cloneDeep(val);
    this.writeState();
    return true;
  }

  public neverWriteAgain() {
    this.dontWrite = true;
  }

  public useLocalFile(filePath: string) {
    this.neverWriteAgain();
    this.filePath = filePath;
    this.readState();
  }
}


const ajv = new Ajv({useDefaults: true, allErrors: true});

class ValidatedLocalStorage<T extends Record<string, any>> extends LocalStorage<T> {
  protected schema: JSONSchema7;
  protected validate: Ajv.ValidateFunction;

  constructor(fileName: string, initState: T, schema: JSONSchema7) {
    super(fileName, initState);

    this.schema = schema;
    this.validate = ajv.compile(schema);
  }
  
  public validateJson() {
    if (!this.validate(this.state)) {
      this.validate.errors.forEach(err => {
        const property: keyof T & string = err.dataPath.slice(1);
        console.error(`Property "${property}" (current value: ${JSON.stringify(this.state[property])}) in ${this.constructor.name} is invalid: "${err.message}"`);
        const defaultVal = (this.schema.properties[property as string] as JSONSchema7).default as T[typeof property];
        console.warn(`Resetting to default value: ${defaultVal}`);
        this.set(property, defaultVal);
      });
    }
    this.writeState();
  }

  public set<K extends keyof T>(key: K, val: T[K]): boolean {
    if (typeof key === 'string') {
      if (!(key in this.state)) {
        console.warn(highlightExp`Key "${key}" not available`)
        return false;
      }
      const newState = {...this.state, [key]: val};
      if (!this.validate(newState)) {
        console.error(`You can't do that: "${this.validate.errors.map(e => e.message).join('; ')}"`);
        return false;
      }
    }

    return super.set(key, val);
  }
}


const defaultConfig = {
  recursionDepth: 3,
  syntaxHighlighting: true,
  musicMetadata: false,
  exifMetadata: false,
  alwaysStart: false,
  initScriptsDir: '',
  extraScriptsDir: '',
  logInitLoadedScripts: false,
};
export const configSchema = recordToSchema(defaultConfig, {recursionDepth: 'integer'});
export type IConfig = typeof defaultConfig;
class Config extends ValidatedLocalStorage<IConfig> {
  constructor() {
    super('config.json', defaultConfig, configSchema);
  }
  
  public reset = () => {
    this.initFile(defaultConfig);
    console.info(`Successfully reset config to default`);
  }
}


type UserScript = string;
type IUserScripts = Record<string, UserScript>;
class UserScripts extends LocalStorage<IUserScripts> {
  constructor() {
    super('userscripts.json', {});
  }

  private keyExists(key: string): boolean {
    if (!this.state[key]) {
      console.warn(`Script with key "${key}" was not found`);
      return false;
    }
    return true;
  }

  public getScript(key: string): UserScript | null {
    return this.keyExists(key) ? this.get(key) : null;
  }

  public delete(key: string) {
    if (!this.keyExists(key)) return;

    // todo: ask if you're sure, show content of script once more
    delete this.state[key];
    this.writeState();
    console.info(`Successfully deleted item with key ${key}`);
  }
}

class UserStorage extends LocalStorage {
  constructor() {
    super('user-storage.json', {});
  }

  public key: Record<string,string> =
    Object.fromEntries(Object.keys(this.state).map(k => [k,k]));

  public get keys(): string[] {
    return Object.keys(this.state);
  }

  public get<T>(key: keyof any): T | undefined {
    return super.get(key);
  }

  public edit<T>(key: keyof any, cb: (prev: T|undefined) => T): boolean {
    return this.set(key, cb(this.get(key)));
  }
}

export class Logger extends LocalStorage {
  constructor() {
    super('aya.log', null, true);
  }

  protected writeState() {}
  protected readState() {}
  protected initFile() {
    fs.writeFileSync(this.filePath, '', 'utf8');
  }

  private formatMsg(verbose: boolean, ...message: any[]): string {
    const toStr = (m: any) => (verbose ? JSON.stringify(m, null, 2) : JSON.stringify(m));
    return message
      .map(m => typeof m === 'undefined' ? 'undefined' : (typeof m === 'string' ? toStr(m) : toStr(m)?.replace(/^"?(.*)"?$/, '$1'))).join(' ')
      .replace(/(?:[^\\]|^)\\([^\\])/g, '$1').replace(/\\\\/g, '\\')
      + (verbose ? '\n\n' : '\n');
  }

  private logRaw(msg: string) {
    fs.appendFileSync(this.filePath, `[${moment().locale('en-gb').format('L LTS')}] ` + msg, 'utf8');
  }
  private logBase(verbose: boolean, ...message: any[]) {
    const msg = this.formatMsg(verbose, ...message);
    this.logRaw(msg);
    return msg;
  }
  public log = (...message: any[]) => {
    this.logBase(false, ...message);
  }
  public logr = (...message: any[]) => {
    this.logRaw(message.join(' '));
  }
  public logv = (...message: any[]) => {
    this.logBase(true, ...message);
  }
  public logl = (...message: any[]) => {
    console.log(this.logBase(false, ...message));
  }
}

export class PersistentLogger extends LocalStorage {
  constructor() {
    super('p-log.json', {});
  }

  public log = (...message: any[]) => {
    const msg = message.join(' ');
    const key = getHashCode(msg);
    if (!this.get(key)) {
      this.set(key, `[${moment().locale('en-gb').format('L LTS')}] ` + msg)
      this.writeState();
    }
  }
}

export const config = new Config();
export const userScripts = new UserScripts();
export const userStorage = new UserStorage();

export const logger = new Logger();
export const pLogger = new PersistentLogger();
