const Database = require('.')
const FileBacking = require('./file-backing')
const MemoryBacking = require('./memory-backing')
const { join } = require('path')

const PathToFile = join(__dirname, './books.json')

const db = new Database(new FileBacking(PathToFile))

const PEOPLE_TABLE = 'people'
const BOOKS_TABLE = 'books'

db.add(PEOPLE_TABLE, {
  id: db.nextId(PEOPLE_TABLE),
  name: 'george',
  age: 24,
  city: 'New York'
})

db.add(PEOPLE_TABLE, {
  id: db.nextId(PEOPLE_TABLE),
  name: 'judy',
  age: 75,
  city: 'Valencia'
})

db.add(PEOPLE_TABLE, {
  id: db.nextId(PEOPLE_TABLE),
  name: 'sally',
  age: 53,
  city: 'Seattle'
})

db.add(BOOKS_TABLE, {
  id: db.nextId(BOOKS_TABLE),
  name: 'A Big Tree',
  author: 'Leafy McLeafeater'
})

db.add(BOOKS_TABLE, {
  id: db.nextId(BOOKS_TABLE),
  name: 'My Hot Tub',
  author: 'Shane Bayne'
})

db
  .query(PEOPLE_TABLE, '.{.age > 38}')
  .forEach(obj => console.log(obj))

console.log('Author query: ', db.query(BOOKS_TABLE, '.{.author *= "Shane"}'))

