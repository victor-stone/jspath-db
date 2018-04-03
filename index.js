const path = require('jspath')
const moment = require('moment')
const Backing = require('./backing')

const checkTable = (table,method) => { if (typeof table !== 'string') { throw new ReferenceError('Table name must be a string in ' + method) } }
/**
 * Light weight db-like object that encourages jspath query
 */
class JSPathDataBase {

  constructor (backing) {
    if (!(backing instanceof Backing)) {
      throw new ReferenceError('JSPathDatabase requires object that extends Backing')
    }
    this._backing = backing
    this._table = this._table.bind(this)
    this._writeSuspended = false
    this._fetch()
    this._lastError = null
    this._noCache = false
  }

  /**
   * Setting this to 'true' tells the database to read the backing (e.g. file) on every query. This is 
   * needed when multiple processes are writing/reading from the same backing
   */
  set noCache (value) {
    this._noCache = value
  }

  /**
   * Generate an ID that is +1 the highest number in the 'id' field of the 'table' parameter
   * @returns {number} id
   * @param {string} table
   */
  nextId (table) {
    checkTable(table, 'nextId')
    const ids = this.query(table, '.id').sort((a, b) => b - a)
    const id = ids && ids.length && !isNaN(ids[0]) ? ids[0] + 1 : 1
    return id
  }

  /**
   * Perform a jspath query on a table
   * @see https://www.npmjs.com/package/jspath
   * @returns {Array} array of results
   * @param {string} table
   * @param {string} q
   */
  query (table, q = '.') {
    checkTable(table, 'query')
    if (table[0] !== '"') {
      table = `"${table}"`
    }
    return this._query(`.${table}${q}`)
  }

  /**
   * Return a single object from a table (first match). Use this if destructuring
   * @returns {any} object gauranteed to return an object
   * @param {string} table
   * @param {string} q jspath query
   * @param {Function} cb perform any massaging on the results before returning
   */
  queryOne (table, q, cb) {
    return this.queryItem(table, q, cb) || {}
  }

  /**
   * Return a single object from a table (first match). Use this if testing for existance
   * @returns {any} Returns null if no match found
   * @param {string} table
   * @param {string} q jspath query
   * @param {Function} cb perform any massaging on the results before returning
   */
  queryItem (table, q = '.', cb) {
    return this.query(table, q + '[0]')
  }

  /**
   * Return a record with the matching id (never null)
   * @returns {any} object guaranteed to return object (never null)
   * @param {string} table
   * @param {number} id
   */
  queryId (table, id) {
    return this.queryOne(table, `.{.id =="${id}"}`)
  }

  /**
   * Test for existance of id
   * @returns {boolean} result of test
   * @param {string} table
   * @param {number} id
   */
  hasId (table, id) {
    return !!this.queryItem(table, `.{.id =="${id}"}`)
  }

  /**
   * Add record(s) to a table
   * @param {string} table
   * @param {Array|object} record
   */
  add (table, record) {
    checkTable(table, 'add')
    if (record === void 0) { throw new ReferenceError('expected record parameter in "add" ') }
    const { _table: t } = this
    if (Array.isArray(record)) {
      this.replaceAll(table, [...t(table), ...record])
    } else {
      t(table).push(record)
      this._write(this._data)
    }
  }

  /**
   * Update a record with replace (no merge)
   * @param {string} table
   * @param {object} record
   * @param {Function} filter - if null, the record is matched with 'id'
   */
  replace (table, record, filter = null) {
    checkTable(table, 'replace')
    if (!record) { throw new ReferenceError('Missing "record" parameter to replace') }
    if (!filter) {
      if (record.id) {
        filter = r => r.id === record.id
      } else {
        throw new ReferenceError('To replace a record it must either have an .id field or you must supply a filter query or filter function')
      }
    }
    this._remove(table, filter)
    this.add(table, record)
  }

  /**
   * Remove records that match a filter. The filter can be either a function that names a record as it's parameter and returns a boolean where true := remove this record, false := retain this record or filter is a query string that matches records to be removed (i.e. any record that matches that query will be removed)
   * @param {string} table
   * @param {Function | string} filter remove the records that match this filter (either function or query)
   */
  remove (table, filter) {
    checkTable(table, 'remove')
    const { _table: t } = this
    let records = null
    if (typeof filter === 'function') {
      records = t(table).filter(q => !filter(q))
    } else {
      const hashes = this.query(table, filter).map(r => JSON.stringify(r)).sort()
      hashes.length && (records = t(table).filter(r => !hashes.includes(JSON.stringify(r))))
    }
    records && this.replaceAll(table, records)
  }

  /**
   * Replace all the records in a table
   * @param {string} table
   * @param {array} records
   */
  replaceAll (table, records) {
    checkTable(table, 'replaceAll')
    const { _table: t } = this
    t(table, records)
  }

  /**
   * Returns the sum of all the values in the 'column' field of 'table' objects
   * @param {string} table name of table
   * @param {string} column name of column/field
   */
  sum (table, column) {
    return this.query(table, '.' + column).reduce((sum, value) => sum += value, 0) // eslint-disable-line no-return-assign
  }

  /**
   * Returns the average for all the values in the 'column' field of 'table' objects
   * @param {string} table name of table
   * @param {string} column name of column/field
   */
  average (table, column) {
    const rows = this.query(table, '.' + column)
    const sum = rows.reduce((sum, value) => sum += value, 0) // eslint-disable-line no-return-assign
    return sum / rows.length
  }

  /**
   * Number of table objects in the database
   * @param {string} table
   */
  numRows (table) {
    checkTable(table, 'numRows')
    return this.data[table].length
  }

  /**
   * @returns {Error} object if the last query caused an exception, otherwise null
   */
  get lastError () {
    return this._lastError
  }

  /**
   * @private
   * @param {string} q
   * @param {object} d
   */
  _query (q, d = this.data) {
    try {
      this._lastError = null
      return path(q, d)
    } catch (e) {
      this._logError(e)
      this._lastError = e
      return []
    }
  }

  /**
   * @private
   * @param {string} table
   * @param {Function} filter - remove every record that matches this filter
   */
  _remove (table, filter) {
    return this.remove(table, filter)
  }

  /**
   * Omnibus internal to read/replace data in a table
   * @private
   * @param {string} table
   * @param {object} data
   */
  _table (table, data = null) {
    const { data: d } = this
    !d[table] && (d[table] = [])
    if (data) {
      d[table] = data
      this._write(d)
    }
    return d[table]
  }

  /**
   * Flush memory to backing
   * @private
   * @param {object} d
   */
  _write (d = this.data) {
    if (!this._writeSuspended) {
      this._backing.write(d)
    }
  }

  /**
   * Read from backing
   * @private
   */
  _read () {
    return this._backing.read()
  }

  _fetch () {
    try {
      this._data = this._read() || {}
    } catch (e) {
      this._data || (this._data = {})
      const oldCacheFlag = this._noCache
      this._noCache = false
      this._logError(e)
      this._noCache = oldCacheFlag
    }    
  }

  _logError (e) {
    const _e = {
      message: e.message,
      date: moment().utc().format()
    }
    this.add('_internal', _e)
  }

  get data () {
    if (this._noCache) {
      this._fetch()
    }
    return this._data
  }
}

module.exports = JSPathDataBase
