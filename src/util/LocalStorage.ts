import * as fs from 'fs';
import { JSONSchema7 } from 'json-schema';
import * as path from 'path';
import { recordToSchema } from './generalUtils';
import * as Ajv from 'ajv';

class LocalStorage<T extends Record<string, any>> {
  protected jsonPath: string;
  protected state: T;

  public get s() { return this.state };

  constructor(fileName: string, initState: T, reset?: boolean) {
    const dir = path.resolve('./.ayaStorage');
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir);
    
    this.jsonPath = path.resolve(dir, fileName);
    if (!fs.existsSync(this.jsonPath) || reset)
      fs.writeFileSync(this.jsonPath, JSON.stringify(initState, null, 2), 'utf8');

    this.readState();
  }

  public getKeysString(): string {
    return Object.keys(this.state).join(", ");
  }

  protected readState() {
    this.state = JSON.parse(fs.readFileSync(this.jsonPath).toString());
  }

  protected writeState() {
    fs.writeFileSync(this.jsonPath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  public set<K extends keyof T>(key: K, val: T[K]): boolean {
    if (this.state[key] === val) {
      console.warn('Nothing changed.');
      return false;
    }
    this.state[key] = val;
    this.writeState();
    return true;
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
        const property: keyof T = err.dataPath.slice(1);
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
};
export const configSchema = recordToSchema(defaultConfig, {recursionDepth: 'integer'});
export type IConfig = typeof defaultConfig;
class Config extends ValidatedLocalStorage<IConfig> {
  constructor() {
    super('config.json', defaultConfig, configSchema);
  }
}


type UserScript = string;
type IUserScripts = Record<string, UserScript>;
class UserScripts extends LocalStorage<IUserScripts> {
  constructor() {
    super('scripts.json', {});
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
    super('log.json', [], true);
  }

  public log(...message: any[]) {
    this.state.push(message.join(' '));
    this.writeState();
  }
}

export const config = new Config();
export const userScripts = new UserScripts();
export const logger = new Logger();
