const Database = require('./index')

const MemoryBacking = require('./memory-backing')
const FileBacking = require('./file-backing')
const { join } = require('path')

const MyData = {

  people: [
    {
      name: 'george',
      age: 24,
      city: 'New York'
    },
    {
      name: 'judy',
      age: 75,
      city: 'Valencia'
    },
    {
      name: 'sally',
      age: 53,
      city: 'Seattle'
    }
  ],

  books: [
    {
      name: 'A Big Tree',
      author: 'Leafy McLeafeater'
    },
    {
      name: 'My Hot Tub',
      author: 'Shane Bayne'
    }
  ]
}

const memDB = new Database(new MemoryBacking())

memDB.add('people', MyData.people)
memDB.add('people', { name: 'bob', age: 39, city: 'Perth' })

const ageQuery = '.{.age > 38}'

memDB.query('people', ageQuery).forEach(obj => console.log(obj))

const nameQuery = '.{.name ==="sally"}'

console.log('Name query: ', memDB.queryOne('people', nameQuery))

const PathToFile = join(__dirname, './books.json')

const fileDB = new Database(new FileBacking(PathToFile))

fileDB.add('books', MyData.books)

const record = { name: 'My Hot Tub', author: 'Shane Bayne with Kurt Burt' }

fileDB.replace('books', record, ({name}) => name === record.name)

/* Result on disk:

{
  "log": [
    {
      "id": 1,
      "msg": "created database",
      "obj": null,
      "date": "2018-01-07T00:09:58Z"
    }
  ],
  "books": [
    {
      "name": "A Big Tree",
      "author": "Leafy McLeafeater"
    },
    {
      "name": "My Hot Tub",
      "author": "Shane Bayne with Kurt Burt"
    }
  ]
}

*/
