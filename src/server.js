

import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { MongoClient } from 'mongodb'

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
 * Check whether uoloaded file is acceptable
 *
 * @param {object} file imported file descriptor
 * @throws {Error} the file cannot be processed
 */
export function checkFile(file) {
  if (!file)
    throw new Error('No file received')

  if (file.mimetype !== 'text/csv')
    throw new Error('Only accept csv files')
}

/**
 * Parse CSV file
 *
 * @param {object} csvParser the CSV parser instance 
 * @param {object} file the imported file descriptor
 * @returns {Promise<object[]>} each line of the CSV file in a key-value object format
 */
export async function parseCSVFile(file) {
  const csvParser = csv({ separator: ',' })
  const parsedLines = []

  const { path } = file
  const parseStream = createReadStream(`./${path}`).pipe(csvParser)

  for await (const data of parseStream) {
    parsedLines.push(data)
  }

  return parsedLines
}

/**
 * Process a line, aggregating additional information to it
 *
 * @param {object} line the line
 * @returns {Promise<object>} the processed line
 */
export async function processLine(line) {
  line.imported = new Date().toISOString()

  // Energy code
  line.energy = EnergyEnum[line.energy]

  // Gearbox type code
  line.gearbox = GearboxEnum[line.gearbox]

  return line
}

/**
 * Save lines to database
 *
 * @param {object} db the MongoDb connection object
 * @param {object[]} lines lines to save
 * @returns {Promise<void>} the save had finished
 */
export async function saveLinesToDb(db, lines) {
  await db.collection('cars').insertMany(lines)
  return lines
}


/**
 * Get database object
 *
 * @param {string} mongoUrl the MongoDb connection url
 * @returns {Promise<object>} the MongoDb database access object
 */
export async function getDatabase(mongoUrl) {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect()
    console.log(`✔️  MongoDb connection to '${mongoUrl}' OK`)

    return client.db()
  } catch (err) {
    console.error(`❌  Unable to connect to MongoDb at url '${mongoUrl}'`)
  }
}
