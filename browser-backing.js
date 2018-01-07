
const { stringify, parse } = JSON;

class BrowserStorageBack {
  constructor(appStateName) {
    this._appStateName = appStateName;
  }
  read() {
    return parse(localStorage.getItem(this._appStateName));
  }
  write(obj) {
    localStorage.setItem(this._appStateName, stringify(obj));
  }
}

module.exports = BrowserStorageBack;
