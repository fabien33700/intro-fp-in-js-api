

import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { MongoClient } from 'mongodb'

// FP librairies
import * as R from 'ramda'
import * as F from 'fluture'
import * as Fn from 'fluture-node'
import S from 'sanctuary'

import { safeProp, BadRequest, fromNodeStream, consoleLog, consoleErr } from './utils.js'

/** Constants  */
const EnergyEnum = Object.freeze({
  E: 'Electric',
  F: 'Fuel',
  G: 'Gasoil',
})

const GearboxEnum = Object.freeze({
  A: 'Automatic with torque converter',
  DC: 'Dual clutch',
  E: 'Electric',
  M: 'Manual',
})

/**
 * Returns a predicate which check whether file MIME type represents a CSV File or not
 * @returns {(string) => boolean} true if file mimetype is CSV, false otherwise
 */
const isCsvFile = S.pipe([
  // |> String
  safeProp('mimetype'),                 // Maybe String
  S.maybe(false)(S.equals('text/csv')), // Boolean
])

/**
 * An uploaded file descriptor
 * @typedef {object} File 
 * @property {string} mimetype the file MIME type
 * @property {string} path the path of the uploaded file
 */

/**
 * Returns a function which try to get the imported file path from the request
 * @returns {(file: File) => Either<HttpError, String>} either the path or an error 
 */
export const tryGetFilepath = 
  // |> File  
  S.pipe([
    S.Just,                       // Maybe Object
    S.chain(safeProp('file')),    // Maybe Object
    S.filter(isCsvFile),          // Maybe Object
    S.chain(safeProp('path')),    // Maybe String
    S.maybeToEither(BadRequest('Requires a valid CSV file')) // Either HttpError | String
  ])

/**
 * Prefix the given path with ./ to make it relative
 * @param {string} path the filepath
 * @returns {string} the relative filepath
 */
const relativePath = path => `./${path}`

/**
 * Get a CSV Parser
 * @param {ReadableStream} stream the readable stream
 * @returns {ReadableStream} stream of parsed csv lines
 */
const pipeCSVParser = stream => stream.pipe(csv({ separator: ',' }))

/**
 * Parse CSV file
 * @param {string} the relative path of the file to parse
 * @returns {Future<Error, object[]>} each line of the CSV file in a key-value object format
 */
export const parseCSVFile =
  // |> String
  R.pipe(
    relativePath,                 // String
    createReadStream,             // ReadableStream
    pipeCSVParser,                // ReadableStream
    Fn.buffer,                    // Future Error | object[]
  )

/**
 * Process a line, aggregating additional information to it
 * @param {object} line the line
 * @returns {object} the processed line
 */
export const processLine = line => ({
  ...line,
  imported: new Date().toISOString(), // Use immutable date
  energy: EnergyEnum[line.energy],
  gearbox: GearboxEnum[line.gearbox],
})

/**
 * Curried function that gets a collection from a Mongo db object
 * @returns {(string) => (Db) => Collection} a function that returns a collection
 */
const getCollection = R.invoker(1, 'collection')
// const getCollection = collectionName => db => db.collection(collectionName)

/**
 * Get the 'cars' collection
 * @returns {(Db) => Collection} a function that returns a collection
 */
const getCarsCollection = getCollection('cars')

/**
 * Insert many items in a collection
 * @param {Collection} collection a Mongo collection
 * @returns {(object[]) => object} a function that insert items into the collection
 */
const insertMany = collection => data => collection.insertMany(data)

/**
 * Save lines to database
 * @param {object} db the MongoDb connection object
 * @param {object[]} lines lines to save
 * @returns {Future<Error, object[]>} a future that will contain the lines that we added
 */
export const saveLines = db => lines =>
  F.encaseP(
    R.pipe(
      getCarsCollection,
      insertMany
    )(db) // data => db.collection('cars').insertMany(data) 
  )(lines)
    .pipe(
      F.map( R.always(lines) ) 
    ) // () => lines 

/**
 * Connect a Mongo client
 * @param {MongoClient} client the Mongo client
 * @returns {Promise<MongoClient>} the connected client instance
 */
const mongoConnect = client => client.connect()

/**
 * Get a Db from the client
 * @param {MongoClient} client the Mongo client
 * @returns {Db} Mongo database instance
 */
const mongoGetDb = client => client.db()

/**
 * Get database object
 * @param {string} mongoUrl the MongoDb connection url
 * @returns {Future<Error, Db>} a future that will contain the MongoDb database access object
 */

export const getDatabase = mongoUrl =>
  F.go(function* () {
    const client = new MongoClient(mongoUrl)
    yield F.encaseP(mongoConnect)(client)
    return mongoGetDb(client)
  })
    .pipe(F.bimap
      ( R.tap( consoleErr(`❌  Unable to connect to MongoDb at url '${mongoUrl}'`) ))
      ( R.tap( consoleLog(`✔️  MongoDb connection to '${mongoUrl}' OK`) ))
    )

