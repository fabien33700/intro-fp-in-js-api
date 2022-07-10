

import { createReadStream } from 'fs'
import { rm, mkdir } from 'fs/promises'
import { MongoClient } from 'mongodb'
import { getPrice } from './priceApi.js'

const EnergyEnum = Object.freeze({
  E: 'Electric',
  F: 'Fuel',
  G: 'Gasoil',
})

const GearboxEnum = Object.freeze({
  DC: 'Dual clutch',
  E: 'Electric',
  M: 'Manual',
})

// Regex for parsing gearbox code
const reGearboxCode = /^(?<type>[A-Z]{1,3})(?<gears>\d)$/gm

/**
 * Parse gearbox code, format XXY where XX is gearbox type and Y is number of gears
 *
 * @param {string} gearboxCode the gearbox code
 * @returns {object} object containing gearbox type and gears number
 */
export function parseGearboxCode(gearboxCode) {
  for (const match of gearboxCode.matchAll(reGearboxCode)) {
    const { type, gears } = match?.groups
    return { type, gears }
  }
}

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
 * Clear the content of a directory
 *
 * @param {string} directory the directory path
 * @returns {Promise<void>} the promise which will resolve when folder will be clean
 */
export async function clearDirectory(directory) {
  if (!directory) return

  await rm(directory, { recursive: true })
  await mkdir(directory)
}

/**
 * Parse CSV file
 *
 * @param {object} csvParser the CSV parser instance 
 * @param {object} file the imported file descriptor
 * @returns {Promise<object[]>} each line of the CSV file in a key-value object format
 */
export async function parseCSVFile(csvParser, file) {
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
  const { type, gears } = parseGearboxCode(line.gearbox)
  line.gearbox = `${GearboxEnum[type] ?? 'Unknown'}, ${gears} gears`

  // Get data from http call
  try {
    line.price = await getPrice(line)
  } catch (err) {
    console.warn('price retrieving had failed', err.message)
  }

  return line
}

/**
 * Save lines to database
 *
 * @param {object} db the MongoDb connection object
 * @param {object[]} lines lines to save
 * @returns {Promise<object[]>} saved lines
 */
export async function saveLinesToDb(db, lines) {
  return db.collection('cars').insertMany(lines)
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

    return {
      client,
      db: client.db()
    }
  } catch (err) {
    console.error(`❌  Unable to connect to MongoDb at url '${mongoUrl}'`)
  }
}

export async function gracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT']
  return Promise.any(
    signals.map(async (signal) =>
      new Promise((resolve) => process.on(signal, () => {
        console.log(`\nReceived signal ${signal}, interrupting ...`)
        resolve()
      }))
    )
  )
}

export async function closeServer(server) {
  console.log(`Closing the server ...`)
  return new Promise((resolve) => {
    server.close(() => {
      console.log(`✔️  Server closed`)
      resolve()
    })
  })
}
