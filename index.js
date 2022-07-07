const express = require('express')
const multer = require('multer')
const csv = require('csv-parser')
require('dotenv').config()

const { 
  checkFile,
  parseCSVFile,
  getDatabase,
  processLine,
  saveLinesToDb,
  clearDirectory,
  clearCars,
} = require('./server')

const uploadDir = 'uploads/'


async function runApp() {
  const mongoUrl = process.env.MONGO_URL
  const app = express()

  const db = await getDatabase(mongoUrl)
  await clearDirectory(`./${uploadDir}`)
  await clearCars

  const csvParser = csv({ separator: ',' })
  const uploads = multer({ dest: uploadDir })


  app.post('/import', uploads.single('content'), async (req, res) => {
    const { file } = req;

    // throws an error
    checkFile(file)

    const lines = await parseCSVFile(csvParser, file)
    const proceededLines = []


    for (const line of lines) {
      proceededLines.push(processLine(line))
    }

    // IO write
    saveLinesToDb(db, proceededLines)

    // writeResponse()
    res.status(200).json(proceededLines)
  })

  const server = app.listen(8080)
}



runApp()



// TODO Installer eslint-plugin-functionnal