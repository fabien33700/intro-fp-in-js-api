import * as R from 'ramda'
import * as F from 'fluture'
import S from 'sanctuary'

/**
 * Write response to client
 * 
 * @param {object} res the Express response object
 * @param {object} status the http status code
 * @param {object} contentType the 'Content-Type' header to send
 * @param {object} body the response body
 * @function
 * @returns {function} a curried function to send response to the client
 */
const writeResponse = R.curry((res, status, contentType, body) =>
  res .status(status)
      .set('Content-Type', contentType)
      .send(body)
)

/**
 * Write a JSON response to the client
 */
export const writeJSONResponse = writeResponse(R.__, R.__, 'application/json', R.__)

/**
 * Write a text response to the client
 */
export const writeTextResponse = writeResponse(R.__, R.__, 'text/plain', R.__)

/**
 * Write a HttpError object to the client
 * @param {object} res the Express response object
 * @returns {(HttpError) => void} a function that takes a HttpError object and write it to the client
 */
export const writeHttpErrorResponse = res => R.pipe(
  R.props(['httpCode', 'message']),
  ([httpCode, message]) => writeTextResponse(res, httpCode, message),
)

/**
 * Write an Error object to the client
 * @param {object} res the Express response object
 * @returns {(Error) => void} a function that takes an Error object and write it to the client
 */
export const writeErrorResponse = res => R.pipe(
  R.prop('message'),
  writeTextResponse(res, 500),
)


/**
 * Returns a function that safely gets a prop from an object
 * @param {string} propName the property name to get
 * @returns {(object) => Maybe<object>} 
 */
export const safeProp = S.get(R.always(true))


/**
 * Constructs an HTTP error
 * @typedef {object} HttpError
 * @property {string} message the error message
 * @property {number} httpCode the HTTP status code
 * @constructor
 */
export const HttpError = (message, httpCode) => ({ message, httpCode })

/**
 * Construct an Bad Request error
 * @returns {(string) => HttpError}
 */
export const BadRequest = R.partialRight(HttpError, [400])

/**
 * Read all chunks from a stream and wrap it in a future once it's finished
 * @param {ReadableStream} stream a Node.js readable stream
 * @returns Future<never, string[]> future value of the array containing chunks 
 */
export const fromNodeStream = stream => F.Future((reject, resolve) => {
  const chunks = []
  const data = d => chunks.push(d)
  const end = () => resolve(chunks)
  stream.on('data', data)
  stream.once('error', reject)
  stream.once('end', end)
  return () => {
    stream.removeListener('data', data)
    stream.removeListener('error', reject)
    stream.removeListener('end', end)
  }
})

/**
 * Create a function that log its arguments in the console with the specified logging level
 * @param {string} level the log level
 * @returns {(...any[]) => void}
 */
const consoleWrite = level => (...args) => _ => console?.[level](...args)

// Functions for the allowed log levels
export const consoleLog = consoleWrite('log')
export const consoleInfo = consoleWrite('info')
export const consoleWarn = consoleWrite('warn')
export const consoleErr = consoleWrite('error')
