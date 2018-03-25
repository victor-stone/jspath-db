const { readFileSync, writeFileSync } = require('fs')
const Bakcing = require('./backing')
const { stringify, parse } = JSON

class FileDataBacking extends Bakcing {

  constructor (pathToData) {
    super(...arguments)
    this._pathToData = pathToData
  }

  write (obj) {
    return writeFileSync(this._pathToData, stringify(obj))
  }

  read () {
    return parse(readFileSync(this._pathToData))
  }

}

module.exports = FileDataBacking
