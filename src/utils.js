import * as R from 'ramda'

export const writeResponse = res => ({ status, contentType, data }) =>
  res .status(status)
      .set('Content-Type', contentType)
      .send(data)

export const writeJSONResponse = res => R.partialObject(writeResponse(res), { contentType: 'application/json'})
export const writeTextResponse = res => R.partialObject(writeResponse(res), { contentType: 'text/plain'})



export const writeErrorResponse = res => R.pipe(
  R.props(['httpCode', 'message']),
  R.zipObj(['status', 'data']),
  writeTextResponse(res),
)

export const writeResultResponse = res => R.pipe(
  R.objOf('data'),
  R.partialObject(writeJSONResponse(res)),
  R.tap(console.log)
)
