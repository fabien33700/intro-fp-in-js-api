

import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { MongoClient } from 'mongodb'

// FP librairies
import S from 'sanctuary'
import { safeProp, BadRequest, fromNodeStream } from './utils.js'

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
  S.chain (safeProp('file')),   // Maybe Object
  S.filter(isCsvFile),          // Maybe Object
  S.chain (safeProp('path')),   // Maybe String
  S.maybeToEither(BadRequest('Requires a valid CSV file')) // Either Error | String
])

/**
 * Parse CSV file
 *
 * @param {object} csvParser the CSV parser instance 
 * @param {object} path the filepath
 * @returns {Future<object[]>} each line of the CSV file in a key-value object format
 */
export function parseCSVFile(path) {
  return fromNodeStream(
    createReadStream(`./${path}`).pipe(csv({ separator: ',' }))
  )
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
