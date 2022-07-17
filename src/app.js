import express from 'express'
import multer from 'multer'


// TODO Diapo sur les types algébriques

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
  writeResultResponse,
} from './utils.js'

import { appPort, mongoUrl, uploadDir } from './config.js'

// FP librairies
import * as R from 'ramda'
import * as F from 'fluture'
import S from 'sanctuary'

// Initializing the application
const app = express()
const db = await getDatabase(mongoUrl)

// Instanciation
const uploads = multer({ dest: uploadDir })

// Routes
app.post('/import', uploads.single('content'), async (req, res) => { 
  S.either // -> Either Error | String
      ( writeErrorResponse(res) )                   // ❌ Error case
      ( R.partialRight(importCSVOperation, [res]))  // ✔️ Success case (String)
    ( tryGetFilepath(req) )
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
  const saveLinesToDb = R.partial(saveLines, [db])

  const errorLogAndWriteOnResponse = R.pipe(
    R.tap(console.error),
    writeErrorResponse(res)
  )

  const writeSuccessResult = res => 
    R.partialObject(writeResultResponse(res), { status: 200 })
  

  F.encaseP(parseCSVFile)(filepath)
    // Future object[]
    .pipe(F.map (processLines))    
    // IO write 
    .pipe(F.chain (F.encaseP ( saveLinesToDb )))
    // Result transform to API Response
    .pipe(F.fork 
      ( errorLogAndWriteOnResponse )  // ❌ Error case
      (  writeSuccessResult(res) )           // ✔️ Success case 
    )
}

app.listen(appPort)
console.log(`✔️  Application started, listening at port ${appPort}`)
