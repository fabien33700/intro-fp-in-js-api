import express from 'express'
import multer from 'multer'

import {
  tryGetFilepath,
  parseCSVFile,
  getDatabase,
  processLine,
  saveLines,
} from './server.js'

import {
  writeErrorResponse,
  writeJSONResponse,
  consoleErr,
} from './utils.js'

import { appPort, mongoUrl, uploadDir } from './config.js'

// FP librairies
import * as R from 'ramda'
import * as F from 'fluture'
import S from 'sanctuary'

// Initializing the application
const app = express()
const uploads = multer({ dest: uploadDir })

const runApp = db => {
  // Routes
  app.post('/import', uploads.single('content'), (req, res) => { 
    S.either 
        ( writeErrorResponse(res) )                   // ❌ Error case
        ( R.partialRight(importCSVOperation, [res]))  // ✔️ Success case (String)
      ( tryGetFilepath(req) ) // -> Either Error | String
  })

  /**
   * Performs the import operation of the imported CSV file
   *
   * @param {string} filepath the imported filepath
   * @param {Response} res the handler response object
   */
  const importCSVOperation = (filepath, res) => {
    // Cut in smaller functions to make them easier to understand
    const processLines = R.map(processLine)

    const errorLogAndWriteOnResponse = R.pipe(
      R.tap(console.error),
      writeErrorResponse(res)
    )

    parseCSVFile(filepath)
      // Future object[]
      .pipe(F.map (processLines))    
      // IO write 
      .pipe(F.chain ( saveLines(db) ) )
      // Result transform to API Response
      .pipe(F.fork 
        ( errorLogAndWriteOnResponse  )  // ❌ Error case
        ( writeJSONResponse(res, 200) )  // ✔️ Success case 
      )
  }

  app.listen(appPort)
  console.log(`✔️  Application started, listening at port ${appPort}`)
}

F.fork
  (consoleErr(`❌ Failed to run the application`))
  (runApp)
(getDatabase(mongoUrl))
