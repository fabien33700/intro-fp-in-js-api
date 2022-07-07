
// TODO Modularité
// TODO Gracefull shutdown
// TODO Docstring
// TODO TypeScript ?
// TODO Finir impératif
// TODO Dépôt Git

const { createReadStream } = require('fs')
const { rm, mkdir } = require('fs/promises')
const { MongoClient } = require('mongodb')

const EnergyEnum = Object.freeze({
  E: 'Electric',
  F: 'Fuel',
  G: 'Gasoil',
})

const GearboxEnum = Object.freeze({
  
})


function checkFile(file) {
  if (file?.mimetype !== 'text/csv') {
    throw new Error('Only accept csv files')
  }  
}  

async function clearDirectory(directory) {
  if (!directory) return 

  await rm(directory, { recursive: true })
  await mkdir(directory)
}

async function parseCSVFile(csvParser, file) {
  const parsedLines = []

  const { path } = file
  const parseStream = createReadStream(`./${path}`).pipe(csvParser)

  for await (const data of parseStream) {
    parsedLines.push(data)
  }

  return parsedLines
}

function processLine(line) {
  line.imported = new Date().toISOString()


  // Energy code
  line.energy = EnergyEnum[line.energy]

  
  // Gearbox type code
  line.gearbox = GearboxEnum[line.gearbox]
  // 
  // TODO
  // Convert code from static db collection, async

  // Get data from http call
  
  return line
}

async function clearCars(db) {
  await db.collection('cars').deleteMany()
}

async function readCarsFromDb(db) {
  return db.collection('cars').find({})
}

async function saveLinesToDb(db, lines) {
  return db.collection('cars').insertMany(lines)
}

async function getDatabase(mongoUrl) {
  const client = new MongoClient(mongoUrl);
  await client.connect()
  console.log(`Connection OK on ${mongoUrl}`)

  return client.db()
}

module.exports = {
  checkFile,
  parseCSVFile,
  getDatabase,
  processLine,
  saveLinesToDb,
  clearDirectory,
  clearCars,
}