# ipp-encoder

Internet Printing Protocol (IPP) encoder and decoder.

This module can be used to implement either a printing client or a
printer server.

[![Build status](https://travis-ci.org/watson/ipp-encoder.svg?branch=master)](https://travis-ci.org/watson/ipp-encoder)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![abstract-encoding](https://img.shields.io/badge/abstract--encoding-compliant-brightgreen.svg?style=flat)](https://github.com/mafintosh/abstract-encoding)

## Installation

```
npm install ipp-encoder
```

## Usage

Printer server example:

```js
var ipp = require('ipp-encoder')
var C = ipp.CONSTANTS

// decode binary buffer from IPP client
var decoded = ipp.request.decode(buf)

// ...handle request...

// prepare response
var response = {
  statusCode: C.SUCCESSFUL_OK, // set `operationId` instead if encoding a request
  requestId: decoded.requestId,
  groups: [
    { tag: C.OPERATION_ATTRIBUTES_TAG, attributes: [
      { tag: C.CHARSET, name: 'attributes-charset', value: 'utf-8' },
      { tag: C.NATURAL_LANG, name: 'attributes-natural-language', value: 'en-us' },
      { tag: C.TEXT_WITH_LANG, name: 'status-message', value: { lang: 'en-us', value: 'successful-ok' } }
    ] },
    { tag: C.JOB_ATTRIBUTES_TAG, attributes: [
      { tag: C.INTEGER, name: 'job-id', value: 147 },
      { tag: C.NAME_WITH_LANG, name: 'job-name', value: { lang: 'en-us', value: 'Foobar' } }
    ] }
  ]
}

// encode response to binary buffer
ipp.response.encode(response) // <Buffer 01 01 00 00 ... >
```

## API

### `ipp.CONSTANTS`

An object containing IPP constants. See `constants.js` for the complete
list.

### `ipp.STATUS_CODES`

Map of IPP status codes to descriptive strings. See `status-codes.js`
for the complete list.

### `ipp.request.decode(buffer[, start][, end])`

Decode an IPP request buffer and returns the request object.

Options:

- `buffer` - The buffer containing the request
- `start` - An optional start-offset from where to start parsing the
  request (defaults to `0`)
- `end` - An optional end-offset specifying at which byte to end the
  decoding (defaults to `buffer.length`)

Request object structure:

```js
{
  version: {
    major: 1,
    minor: 1
  },
  operationId: 0x02,
  requestId: 1,
  groups: [
    { tag: C.OPERATION_ATTRIBUTES_TAG, attributes: [
      { tag: 0x47, name: 'attributes-charset', value: ['utf-8'] },
      { tag: 0x48, name: 'attributes-natural-language', value: ['en-us'] },
      { tag: 0x45, name: 'printer-uri', value: ['ipp://watson.local.:3000/'] },
      { tag: 0x42, name: 'job-name', value: ['foobar'] },
      { tag: 0x22, name: 'ipp-attribute-fidelity', value: [true] }
    ] },
    { tag: C.JOB_ATTRIBUTES_TAG, attributes: [
      { tag: 0x21, name: 'copies', value: [20] },
      { tag: 0x44, name: 'sides', value: ['two-sided-long-edge'] }
    ] }
  ]
}
```

After decoding `ipp.request.decode.bytes` is set to the amount of bytes
used to decode the object.

Note that any data after the IPP headers are ignored.

### `ipp.request.encode(obj[, buffer][, offset])`

Encode an IPP request object and returns en encoded buffer.

Options:

- `obj` - The object containing the request
- `buffer` - An optional buffer in which to write the encoded request
- `offset` - An optional offset from where to start writing the encoded
  data in the buffer (defaults to `0`)

Response object structure:

```js
{
  statusCode: 0x00,
  requestId: 1,
  groups: [
    { tag: C.OPERATION_ATTRIBUTES_TAG, attributes: [
      { tag: 0x47, name: 'attributes-charset', value: ['utf-8'] },
      { tag: 0x48, name: 'attributes-natural-language', value: ['en-us'] },
      { tag: 0x41, name: 'status-message', value: ['successful-ok'] }
    ] },
    { tag: C.JOB_ATTRIBUTES_TAG, attributes: [
      { tag: 0x21, name: 'job-id', value: [147] },
      { tag: 0x45, name: 'job-uri', value: ['ipp://watson.local.:3000/123'] }
      { tag: 0x44, name: 'job-state', value: ['pending'] }
    ] }
  ]
}
```

It's possible to provide a custom IPP version in the same format is seen
in the request. Default IPP version is 1.1.

After encoding, `ipp.request.encode.bytes` is set to the amount of bytes
used to encode the object.

### `ipp.request.encodingLength(obj)`

Returns the number of bytes it would take to encode the given IPP
request object.

### `ipp.response.decode(buffer[, start][, end])`

Same as `ipp.request.decode()`, but for IPP responses.

After decoding `ipp.response.decode.bytes` is set to the amount of bytes
used to decode the object.

### `ipp.response.encode(obj[, buffer][, offset])`

Same as `ipp.request.encode()`, but for IPP responses.

After encoding, `ipp.response.encode.bytes` is set to the amount of bytes
used to encode the object.

### `ipp.response.encodingLength(obj)`

Same as `ipp.request.encodingLength()`, but for IPP responses.

## License

MIT
