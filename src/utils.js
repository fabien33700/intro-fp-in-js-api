import * as R from 'ramda'
import * as F from 'fluture'
import S from 'sanctuary'

/**
 * Write response to client
 * 
 * @param {object} args 
 * @param {object} args.res the Express response object
 * @param {object} args.status the http status code
 * @param {object} args.contentType the 'Content-Type' header to send
 * @param {object} args.body the response body
 * @function
 * @returns {function} a curried function to send response to the client
 */
const writeResponse = R.curry((res, status, contentType, body) =>
  res .status(status)
      .set('Content-Type', contentType)
      .send(body)
)

/**
 * 
 */
export const writeJSONResponse = writeResponse(R.__, R.__, 'application/json', R.__)
export const writeTextResponse = writeResponse(R.__, R.__, 'text/plain', R.__)

export const writeErrorResponse = res => R.pipe(
  R.props(['httpCode', 'message']),
  ([httpCode, message]) => writeTextResponse(res, httpCode, message),
)

export const safeProp = S.get(R.always(true))

export const HttpError = (message, httpCode) => ({ message, httpCode })
export const BadRequest = R.partialRight(HttpError, [400])

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

const consoleWrite = level => (...args) => _ => console?.[level](...args)
export const consoleLog = consoleWrite('log')
export const consoleInfo = consoleWrite('info')
export const consoleWarn = consoleWrite('warn')
export const consoleErr = consoleWrite('error')
