interface IConst {
  defaultToScriptDirectory: boolean;
  pictureOrgConfigs: {
    [configName: string]: { to: string[]; fro: string[]; };
  };
}

const Const: IConst = {
  defaultToScriptDirectory: true,
  pictureOrgConfigs: {
    meh: { to: [], fro: ['neh', 'meh'] },
    neh: { to: ['meh'], fro: ['neh'] },
    '0': { to: ['meh', 'neh'], fro: [] },
  },
}

// Not editable
const C = Object.freeze(Const);
export default C;
