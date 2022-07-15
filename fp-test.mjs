import * as F from 'fluture'
import * as R from 'ramda'
import S from 'sanctuary'

// const { Left, Right } = S

// const test = S.either
//   (e => `error: ${e}`)
//   (v => `value: ${v}`)


// const double = R.map(x => x * 2)

// const v = Left('cpt')
// const result = R.pipe(double, test)(v)
// console.log(result)

// const getFile = R.prop('file')
// const predFileIsValid =
//   R.pipe(
//     R.both
//       ( R.compose ( R.not, R.isNil ) )
//       ( R.propEq('mimetype')('text/csv') )
//   )



// const eitherFile = R.ifElse(predFileIsValid)
//     ( Right ) 
//     ( () => Left('no CSV file imported') )

// const getPath = R.pipe(
//   eitherFile,
//   S.map(getFile),
// )


// const t1 = S.gets( S.equals('text/csv')) (['file', 'mimetype'])
// const t2 = (v) => S.maybeToEither('Requires a valid CSV file')(t1(v))
// const t3 = S.map()
// console.log(t3(req))

// const isCsvFile = S.pipe([
//   S.prop('mimetype'),
//   S.equals('text/csv')
// ])

// // console.log(S.of (S.Maybe) (undefined))

// // maybeFilter :: (a -> Boolean) -> Maybe a
const maybeFilter = pred => S.ifElse(pred)(S.Just)(() => S.Nothing)

// // Type = Req
// const req = { 
//   file: {
//     mimetype: 'text/csv',
//     path: '/abc'
//   } 
// }

// const safeProp = S.get(() => true)
// // Req -> String
// const getUploadedCsvFilePathFromRequest = S.pipe([
//   safeProp('file'), // -> Maybe String
//   // S.map(safeProp('mimetype')),
//   // S.map(S.toUpper), // -> Maybe<Object>
//   // S.maybeToEither('Requires a valid CSV file'), // -> Either<String, Object>
//   // S.map(S.prop('path')), // -> Either<String, String>
//   // S.either // -> String
//   //   (e => `error: ${e}`)
//   //   (path => `path is ${path}`)
// ])
  
// // console.log(isCsvFile({ mimetype: 'text/csv' }))
// console.log(getUploadedCsvFilePathFromRequest(req))

const fromNullable = S.ifElse(R.isNil) (() => S.Nothing) (S.Just)
const safeProp = S.get(() => true)
const req = { 
  file: {
    mimetype: 'text/csv',
    path: '/abc'
  } 
}

// const isCsv = S.pipe(
//   safeProp('mimetype'),
//   // S.chain (maybeFilter(S.equals('text/csv')))
// )


const isCsvFile = S.pipe([
  safeProp('mimetype'), // Maybe String
  S.maybe(false)(S.equals('text/csv')), // Boolean
])


S.pipe([
  S.Just, // Maybe Object
  S.chain (safeProp('file')), // Maybe Object
  S.filter(isCsvFile),
])(req)



// const o = R.map(x => x * 2)(S.Left(4))
// console.log(o)
