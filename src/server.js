

import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { MongoClient } from 'mongodb'

// FP librairies
import * as R from 'ramda'
import * as F from 'fluture'
import S from 'sanctuary'
import { safeProp, BadRequest, fromNodeStream, consoleLog, consoleErr } from './utils.js'

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
 * Returns a predicate which check whether file MIME type represent a CSV File
 * 
 * @returns {(mimetype: string) => boolean} true if file mimetype is CSV, false otherwise
 */
const isCsvFile = S.pipe([
  // |> String
  safeProp('mimetype'),                 // Maybe String
  S.maybe(false)(S.equals('text/csv')), // Boolean
])

/**
 * An uploaded file descriptor
 *
 * @typedef {object} File 
 * @property {string} mimetype the file MIME type
 * @property {string} path the path of the uploaded file * 
 */

/**
 * Returns a function which try to get the imported file path
 *
 * @returns {(file: File) => Either<Error|String>} either the path or an error 
 */
export const tryGetFilepath = S.pipe([
  // |> File
  S.Just,                       // Maybe Object
  S.chain(safeProp('file')),   // Maybe Object
  S.filter(isCsvFile),          // Maybe Object
  S.chain(safeProp('path')),   // Maybe String
  S.maybeToEither(BadRequest('Requires a valid CSV file')) // Either Error | String
])

const relativePath = path => `./${path}`

/**
 * Parse CSV file
 *
 * @param {object} csvParser the CSV parser instance 
 * @param {object} path the filepath
 * @returns {Future<object[]>} each line of the CSV file in a key-value object format
 */
export const parseCSVFile =
  R.pipe(
    relativePath,
    createReadStream,
    R.invoker(1, 'pipe')(csv({ separator: ',' })),
    fromNodeStream,
  )


/**
 * Process a line, aggregating additional information to it
 *
 * @param {object} line the line
 * @returns {Promise<object>} the processed line
 */
export const processLine = line => ({
  ...line,
  imported: new Date().toISOString(), // Use immutable date
  energy: EnergyEnum[line.energy],
  gearbox: GearboxEnum[line.gearbox],
})

// const getCollection = collectionName => db => db.collection(collectionName)
const getCollection = R.invoker(1, 'collection')

const getCarsCollection = getCollection('cars')
const insertMany = collection => data => collection.insertMany(data)

/**
 * Save lines to database
 *
 * @param {object} db the MongoDb connection objecdbt
 * @param {object[]} lines lines to save
 * @returns {Promise<void>} the save had finished
 */
export const saveLines = db => lines =>
  F.encaseP(
    R.pipe(
      getCarsCollection,
      insertMany
    )(db)
  )(lines)
    .pipe(F.map(R.always(lines)))


/**
 * Get database object
 *
 * @param {string} mongoUrl the MongoDb connection url
 * @returns {Promise<object>} the MongoDb database access object
 */
export const getDatabase = mongoUrl => {
  const mongoClient = R.partialRight(R.construct(MongoClient), [{ useNewUrlParser: true }])
  const mongoConnect = R.invoker(0, 'connect')
  const mongoGetDb = R.invoker(0, 'db')

  return F.go(function* () {
    const client = yield F.encase(mongoClient)(mongoUrl)
    yield F.encaseP(mongoConnect)(client)
    return mongoGetDb(client)
  })
    .pipe(F.bimap
      (R.tap(consoleErr(`❌  Unable to connect to MongoDb at url '${mongoUrl}'`)))
      (R.tap(consoleLog(`✔️  MongoDb connection to '${mongoUrl}' OK`)))
    )
}
