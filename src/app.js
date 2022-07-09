import express from 'express'
import multer from 'multer'
import csv from 'csv-parser'

import {
  checkFile,
  parseCSVFile,
  getDatabase,
  processLine,
  saveLinesToDb,
  clearDirectory,
  gracefulShutdown,
  closeServer
} from './server.js'

import { appPort, mongoUrl, uploadDir } from './config.js'


// Initializing the application
const app = express()
const { client, db } = await getDatabase(mongoUrl)

await clearDirectory(`./${uploadDir}`)

// Instanciation
const csvParser = csv({ separator: ',' })
const uploads = multer({ dest: uploadDir })


// Routes
app.post('/import', uploads.single('content'), async (req, res) => {
  const { file } = req

  // throws an error
  checkFile(file)

  const lines = await parseCSVFile(csvParser, file)
  const proceededLines = []


  for (const line of lines) {
    const newLine = await processLine(line)
    proceededLines.push(newLine)
  }

  // IO write
  await saveLinesToDb(db, proceededLines)

  // writeResponse()
  res.status(200).json(proceededLines)
})

const server = app.listen(appPort)
console.log(`✔️  Application started, listening at port ${appPort}`)

// Graceful shutdown handling
await gracefulShutdown()
await closeServer(server)
await client.close()
console.log(`✔️  Database connection closed`)
