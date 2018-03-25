const expect = require('chai').expect
const JSPathDataBase = require('../')
const MemoryBacking = require('../memory-backing')
const FileBacking = require('../file-backing')
const { unlinkSync } = require('fs')

const TABLE_NAME = 'test'
const FILE_NAME = './testing.json'
const TEST_OBJ_KEY = 'foo'
const TEST_OBJ_VAL = 'bar'
const TEST_OBJ_QUERY = `.{.${TEST_OBJ_KEY} === "${TEST_OBJ_VAL}"}`
const TEST_OBJ = { [TEST_OBJ_KEY]: TEST_OBJ_VAL }

function createDB () {
  return new JSPathDataBase(new MemoryBacking())
}

function createFileDB () {
  const fb = new FileBacking(FILE_NAME)
  return new JSPathDataBase(fb)
}

function writeToDisk (table, record) {
  const db = createFileDB()
  db.add(table, record)
}

function deleteFromDisk (table, filter) {
  const db = createFileDB()
  db.remove(table, filter)
}

function deleteFile () {
  try { unlinkSync(FILE_NAME) } catch (e) { }
}

describe('db tests', function () {

  it('should complain about Backing object', function () {
    expect(() => new JSPathDataBase()).to.throw('Backing')
  })

  it('should create a memory backed database', function () {
    const db = createDB()
    expect(db).to.be.instanceOf(JSPathDataBase)
  })

  describe('manipulation api', function () {
    it('should insert a record', function () {
      const db = createDB()
      db.add(TABLE_NAME, TEST_OBJ)
      const result = db.query(TABLE_NAME)
      expect(result).to.eql([TEST_OBJ])
    })

    it('should complain about missing table name for add', function () {
      const db = createDB()
      expect(() => db.add()).to.throw('add')
    })

    it('should complain about missing record parameter to add', function () {
      const db = createDB()
      expect(() => db.add(TABLE_NAME)).to.throw('record parameter')
    })

    it('should create a table and id of 1', function () {
      const db = createDB()
      expect(db.nextId(TABLE_NAME)).to.eq(1)
    })

    it('should create an id of 2', function () {
      const db = createDB()
      const obj = { id: db.nextId(TABLE_NAME) }
      db.add(TABLE_NAME, obj)
      expect(db.nextId(TABLE_NAME)).to.eq(2)
    })

    it('should complain if replace record has no id ', function () {
      const db = createDB()
      expect(() => db.replace(TABLE_NAME, {})).to.throw('record')
    })

    it('should remove a record ', function () {
      const db = createDB()
      db.add(TABLE_NAME, TEST_OBJ)
      db.remove(TABLE_NAME, TEST_OBJ_QUERY)
      expect(!db._data[TABLE_NAME].find(d => d[TEST_OBJ_KEY] === TEST_OBJ_VAL)).to.equal(true)
    })
  })

  describe('file i/o tests', function () {
    before(deleteFile)

    it('should add an object to disk', function () {
      writeToDisk(TABLE_NAME, TEST_OBJ)
      const db = createFileDB()
      const result = db.query(TABLE_NAME)
      expect(result[0]).to.eql(TEST_OBJ)
    })

    it('should delete an object from disk', function () {
      writeToDisk(TABLE_NAME, TEST_OBJ)
      deleteFromDisk(TABLE_NAME, TEST_OBJ_QUERY)
      const db = createFileDB()
      const result = db.query(TABLE_NAME)
      expect(result.length).is.equal(0)
    })

    it('should not find object created by other instance (noCache: false)', function () {
      const db = createFileDB()
      writeToDisk(TABLE_NAME, TEST_OBJ)
      const result = db.query(TABLE_NAME)
      expect(result.length).is.eq(0)
    })

    it('should find object created by other instance (noCache: true)', function () {
      const db = createFileDB()
      writeToDisk(TABLE_NAME, TEST_OBJ)
      db.noCache = true
      const result = db.query(TABLE_NAME)
      expect(result[0]).to.eql(TEST_OBJ)
    })

    it('should not find object deleted by other instance (noCache: true)', function () {
      const db = createFileDB()
      db.noCache = true
      db.add(TABLE_NAME, TEST_OBJ)
      deleteFromDisk(TABLE_NAME, TEST_OBJ_QUERY)
      const result = db.query(TABLE_NAME)
      expect(result.length).is.eq(0)
    })

    it('should find 2 objects created by 2 instances (noCache: true)', function () {
      const db = createFileDB()
      db.noCache = true
      writeToDisk(TABLE_NAME, TEST_OBJ)
      db.add(TABLE_NAME,TEST_OBJ)
      const result = db.query(TABLE_NAME)
      expect(result).to.eql([ TEST_OBJ, TEST_OBJ ])
    })

    afterEach(deleteFile)
  })

})
