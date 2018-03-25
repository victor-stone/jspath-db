/* globals localStorage */
const Backing = require('./backing')

const { stringify, parse } = JSON

class BrowserStorageBack extends Backing {

  constructor (appStateName) {
    super(...arguments)
    this._appStateName = appStateName
  }

  read () {
    return parse(localStorage.getItem(this._appStateName))
  }

  write (obj) {
    localStorage.setItem(this._appStateName, stringify(obj))
  }
}

module.exports = BrowserStorageBack
