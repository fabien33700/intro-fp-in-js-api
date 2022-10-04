import express from 'express'
import multer from 'multer'

// FP librairies
import * as R from 'ramda'
import * as F from 'fluture'
import S from 'sanctuary'

import {
  tryGetFilepath,
  parseCSVFile,
  getDatabase,
  processLine,
  saveLines,
} from './server.js'

import {
  writeErrorResponse,
  writeHttpErrorResponse,
  writeJSONResponse,
  consoleErr,
} from './utils.js'

import { appPort, mongoUrl, uploadDir } from './config.js'

// Initializing the application
const app = express()
const uploads = multer({ dest: uploadDir })

/**
 * Run the application
 * @param {Db} db the Mongo database access object
 */
const runApp = db => {
  // Routes
  app.post('/import', uploads.single('content'), (req, res) => { 
    S.either 
        ( writeHttpErrorResponse(res) )               // ❌ Error case
        ( R.partialRight(importCSVOperation, [res]))  // ✔️ Success case (String)
      ( tryGetFilepath(req) ) // -> Either Error | String
  })

  /**
   * Performs the import operation of the imported CSV file
   * @param {string} filepath the imported filepath
   * @param {Response} res the handler response object
   */
  const importCSVOperation = (filepath, res) => {
    // Cut in smaller functions to make them easier to understand
    const processLines = R.map(processLine)

    /**
     * Write error response to the client and log it
     */
    const errorLogAndWriteOnResponse = R.pipe(
      R.tap(console.error),
      writeErrorResponse(res)
    )

    // Parse the CSV file
    parseCSVFile(filepath)
    .pipe(F.map(R.tap(console.log)))
      // |> Future Error | object[]
      .pipe(F.map ( processLines ))    
      // IO write : save lines to db
      .pipe(F.chain ( saveLines(db) ))
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
  (consoleErr(`❌ Failed to run the application`))    // ❌ Error case
  (runApp)                                            // ✔️ Success case 
(getDatabase(mongoUrl))
