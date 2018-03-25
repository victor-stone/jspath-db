const Backing = require('./backing')
const { stringify, parse } = JSON

class MemoryStorageBacking extends Backing {
  
  constructor () {
    super(...arguments)
    this._data = {}
  }
  
  read () {
    const str = stringify(this._data)
    return parse(str)
  }

  write (obj) {
    const str = stringify(obj)
    this._data = parse(str)
  }
}

module.exports = MemoryStorageBacking
