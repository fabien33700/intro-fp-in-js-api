import express from 'express'
import multer from 'multer'
import * as R from 'ramda'

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

  // // throws an error
  // checkFile(file)

  const lines = await parseCSVFile(file.path)
  await Promise.all(
    lines.map(processLine)
  )
    .then(R.partial(saveLinesToDb, [db]))
    .then(R.partial(writeResponse, [res]))



  // IO write
  // saveLinesToDb(db, processedLines)

  // writeResponse()

})

function writeResponse(res, processedLines) {
  res.status(200).json(processedLines)
}

app.listen(appPort)
console.log(`✔️  Application started, listening at port ${appPort}`)
