interface IConst {
  musicMetadata: boolean,
  imageMetadata: boolean,
}

const Const: IConst = {
  musicMetadata: false,
  imageMetadata: true,
}

// Not editable
const C = Object.freeze(Const);
export default C;
