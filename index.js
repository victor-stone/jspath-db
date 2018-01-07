const path = require('jspath');
const moment = require('moment');

class Data {

  constructor(backing) {
    this._backing = backing;
    this.logErrors = this.logError = this.logError.bind(this);
    this._table = this._table.bind(this);
    this._writeSuspended = false;
    try {
      this._data = this._read() || {};
    } catch (e) {
      this._data || (this._data = {});
      if (e.code === 'ENOENT') {
        this.log('created database');
      } else {
        this.logError(e);
      }
    }
  }

  /**
   * Flush log (regular and errors)
   */
  cleanLogs() {
    this._writeSuspended = true;
    this.replaceAll('_internal', []);
    this.replace('system', [], ({ id }) => id !== 1);
    this.log('cleaned logs');
    this._writeSuspended = false;
    this._write();
  }

  /**
   * Store an error report in the 'error' table
   * 
   * @param {any} error 
   */
  logError(error) {
    this.log( error.message, 'error', error);
    return error;
  }

  /**
   * Store a message and any attachement it's own table ('log' by default)
   * 
   * @param {string} msg 
   * @param {any} obj 
   */
  log(msg, type='log', obj = null) {
    this.add(type, {
      id: this.nextId(type),
      msg,
      obj,
      date: moment().utc().format()
    });
    console[type === 'error' ? 'error' : 'info']( type + ': ', msg, obj || '');
  }

  /**
   * Generate an ID that is +1 the highest number in the 'id' field of the 'table' parameter
   * @returns {number} id
   * @param {string} table 
   */
  nextId(table) {
    let id = this.queryItem(table, '.id', this._dec) || 0;
    if (isNaN(id)) {
      id = 0;
    }
    return id + 1;
  }

  /**
   * Perform a jspath query on a table
   * @see https://www.npmjs.com/package/jspath
   * @returns {Array} array of results
   * @param {string} table 
   * @param {string} q 
   */
  query(table, q) {
    return this._query(`.${table}${q}`);
  }

  /**
   * Return a single object from a table (first match). Use this if destructuring
   * @returns {any} object gauranteed to return an object 
   * @param {string} table 
   * @param {string} q jspath query
   * @param {Function} cb perform any massaging on the results before returning
   */
  queryOne(table, q, cb) {
    return this.queryItem(table, q, cb) || {};
  }

  /**
   * Return a single object from a table (first match). Use this if testing for existance
   * @returns {any} Returns null if no match found
   * @param {string} table 
   * @param {string} q jspath query
   * @param {Function} cb perform any massaging on the results before returning
   */
  queryItem(table, q, cb) {
    const qresult = this.query(table, q);
    const result = cb ? cb(qresult) : qresult;
    return result.length ? result[0] : null;
  }

  /**
   * Return a record with the matching id (never null)
   * @returns {any} object guaranteed to return object (never null)
   * @param {string} table 
   * @param {number} id 
   */
  queryId(table, id) {
    return this.queryOne(table, `.{.id =="${id}"}`);
  }

  /**
   * Test for existance of id
   * @returns {boolean} result of test
   * @param {string} table 
   * @param {number} id 
   */
  hasId(table, id) {
    return !!this.queryItem(table, `.{.id =="${id}"}`);
  }

  /**
   * Add record(s) to a table
   * @param {string} table 
   * @param {Array|{}} record 
   */
  add(table, record) {
    const { _table: t } = this;
    if (Array.isArray(record)) {
      this.replaceAll(table, [...t(table), ...record]);
    } else {
      t(table).push(record);
      this._write(this._data);
    }
  }

  /**
   * Update a record with replace (no merge)
   * @param {string} table 
   * @param {{}} record 
   * @param {()} filter - if null, the record is matched with 'id'
   */
  replace(table, record, filter = null) {
    if (!filter) {
      filter = r => r.id === record.id;
    }
    this._remove(table, filter);
    this.add(table, record);
  }

  /**
   * Replace all the records in a table
   * @param {string} table 
   * @param {[]} records 
   */
  replaceAll(table, records) {
    const { _table: t } = this;
    t(table, records);
  }

  /**
   * @private
   * @param {string} q 
   * @param {{}} d 
   */
  _query(q, d = this._data) {
    try {
      //console.log('QUERY: ', q );
      return path(q, d);
    } catch (e) {
      console.log('ERROR during jspath query: ' + q, e);
      const _e = {
        message: e.message,
        date: moment().utc().format()
      };
      this.add('_internal', _e);
      return [];
    }

  }

  /**
   * @private
   * @param {string} table 
   * @param {()} filter - remove every record that matches this filter
   */
  _remove(table, filter) {
    const { _table: t } = this;
    this.replaceAll(table, t(table).filter(q => !filter(q)));
  }

  /**
   * Omnibus internal to read/replace data in a table
   * @private
   * @param {string} table 
   * @param {{}} data 
   */
  _table(table, data = null) {
    const { _data: d } = this;
    !d[table] && (d[table] = []);
    if (data) {
      d[table] = data;
      this._write(d);
    }
    return d[table];
  }

  /**
   * Flush memory to backing
   * @private
   * @param {{}} d 
   */
  _write(d = this._data) {
    if (!this._writeSuspended) {
      this._backing.write(d);
    }
  }

  /**
   * Read from backing
   * @private
   */
  _read() {
    return this._backing.read();
  }

  _dec(s) {
    return s.sort((a, b) => a > b ? -1 : 1);
  }

  _inc(s) {
    return s.sort((a, b) => a > b ? 1 : -1);
  }
}

module.exports = Data;
