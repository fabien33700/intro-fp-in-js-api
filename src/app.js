import express from 'express'
import multer from 'multer'

import {
  checkFile,
  parseCSVFile,
  getDatabase,
  processLine,
  saveLinesToDb,
} from './server.js'

import { appPort, mongoUrl, uploadDir } from './config.js'

// Initializing the application
const app = express()
const db = await getDatabase(mongoUrl)

// Instanciation

const uploads = multer({ dest: uploadDir })

// Routes
app.post('/import', uploads.single('content'), async (req, res) => {
  const { file } = req

  // throws an error
  checkFile(file)

  const lines = await parseCSVFile(file)
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

app.listen(appPort)
console.log(`✔️  Application started, listening at port ${appPort}`)
