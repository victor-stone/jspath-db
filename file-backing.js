const { readFileSync, writeFileSync } = require('fs');

const { stringify, parse } = JSON;

class FileDataBacking {
  constructor(pathToData) {
    this._pathToData = pathToData;
  }
  write(obj) {
    return writeFileSync(this._pathToData, stringify(obj));
  }
  read() {
    parse(readFileSync(this._pathToData));
  }
}

module.exports = FileDataBacking;
