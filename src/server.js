

import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { MongoClient } from 'mongodb'
import { List } from 'immutable'

// FP librairies
import * as R from 'ramda'
import S from 'sanctuary'
import { safeProp } from './fp.js'

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

const HttpError = (message, httpCode) => ({ message, httpCode })
const BadRequest = R.partialRight(HttpError, [400])

const isCsvFile = S.pipe([
  safeProp('mimetype'), // Maybe String
  S.maybe(false)(S.equals('text/csv')), // Boolean
])

/**
 * Check whether uoloaded file is acceptable
 *
 * @param {object} file imported file descriptor
 * @throws {Error} the file cannot be processed
 */
export const tryGetFilepath = S.pipe([
  S.Just, // Maybe Object
  S.chain (safeProp('file')), // Maybe Object
  S.filter(isCsvFile), // Maybe Object
  S.chain (safeProp('path')), // Maybe String
  S.maybeToEither(BadRequest('Requires a valid CSV file')) // Either Error | String
])

/**
 * Parse CSV file
 *
 * @param {object} csvParser the CSV parser instance 
 * @param {object} path the filepath
 * @returns {Promise<object[]>} each line of the CSV file in a key-value object format
 */
export async function parseCSVFile(path) {
  const parseStream = createReadStream(`./${path}`).pipe(csv({ separator: ',' }))
  const asyncIterator = parseStream[Symbol.asyncIterator]()

  return walkAsyncIterator(asyncIterator)
}

export function walkAsyncIterator(asyncIterator, acc = List()) {
  return asyncIterator.next().then(({ done, value }) => {
    if (done) return acc.toJS()
    return walkAsyncIterator(asyncIterator, acc.push(value))
  })
}

/**
 * Process a line, aggregating additional information to it
 *
 * @param {object} line the line
 * @returns {Promise<object>} the processed line
 */
export function processLine(line) {
  return { 
    ...line,
    imported: new Date().toISOString(), // Use immutable date
    energy: EnergyEnum[line.energy],
    gearbox: GearboxEnum[line.gearbox],
  }
}

/**
 * Save lines to database
 *
 * @param {object} db the MongoDb connection object
 * @param {object[]} lines lines to save
 * @returns {Promise<void>} the save had finished
 */
export const saveLines = (db, lines) => 
  db.collection('cars').insertMany(lines).then(() => lines)


/**
 * Get database object
 *
 * @param {string} mongoUrl the MongoDb connection url
 * @returns {Promise<object>} the MongoDb database access object
 */
export async function getDatabase(mongoUrl) {
  try {
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true });
    await client.connect()
    console.log(`✔️  MongoDb connection to '${mongoUrl}' OK`)

    return client.db()
  } catch (err) {
    console.error(`❌  Unable to connect to MongoDb at url '${mongoUrl}'`)
    throw err
  }
}
