# jspath-db
A quick and dirty db-like object that uses [jspath](https://www.npmjs.com/package/jspath) for query dsm

Backing provided for file, memory and browser localStorage

# Example (file based)
````javascript
const Database = require('jspath-db');
const FileBacking = require('jspath-db/file-backing');
const { join } = require('path');

const MyData = [
  {
    name: 'A Big Tree',
    author: 'Leafy McLeafeater'
  },
  {
    name: 'My Hot Tub',
    author: 'Shane Bayne'
  }
];

const PathToFile = join( __dirname, './books.json' );

const fileDB = new Database( new FileBacking( PathToFile ) );

fileDB.add( 'books', MyData );

const record = { name: 'My Hot Tub', author: 'Shane Bayne with Kurt Burt' };

fileDB.replace( 'books', record, ({name}) => name === record.name );

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

*/````

# Example (in memory)

````javascript
const Database = require('jspath-db');

const MemoryBacking = require('jspath-db/memory-backing');

const MyData = 
[
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
]

const memDB = new Database( new MemoryBacking() );

memDB.add( 'people', MyData.people );
memDB.add( 'people', { name: 'bob', age: 39, city: 'Perth' } );

const ageQuery = '.{.age > 38}';

memDB.query( 'people', ageQuery ).forEach( obj => console.log(obj) );

/*
Object {name: "judy", age: 75, city: "Valencia"}
Object {name: "sally", age: 53, city: "Seattle"}
Object {name: "bob", age: 39, city: "Perth"}
*/````
