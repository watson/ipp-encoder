'use strict'

var test = require('tape')
var C = require('./constants')
var ipp = require('./')

test('encodingLength', function (t) {
  var types = ['request', 'response']

  types.forEach(function (type) {
    t.test(type + ' minimal', function (t) {
      var len = ipp[type].encodingLength({})
      t.deepEqual(len, 9)
      t.end()
    })

    test(type + ' groups', function (t) {
      var date = new Date(2015, 11, 1, 1, 23, 45, 678)
      var obj = { // version + statusCode + operationId/requestId: +8
        groups: [
          { tag: 0, attributes: [ // +1 (9)
            { tag: C.KEYWORD, name: 'string', value: 'foo' }, // +1+2+6+2+3=14 (23)
            { tag: C.KEYWORD, name: 'array', value: ['foo', 'bar'] }, // +1+2+5+2+3+1+2+0+2+3=21 (44)
            { tag: C.BOOLEAN, name: 'bool', value: true }, // +1+2+4+2+1=10 (54)
            { tag: C.ENUM, name: 'enum', value: 1 } // +1+2+4+2+4=13 (67)
          ] },
          { tag: 1, attributes: [ // +1 (68)
            { tag: C.KEYWORD, name: 'string', value: ['foo'] }, // +1+2+6+2+3=14 (82)
            { tag: C.TEXT_WITH_LANG, name: 'text-with-language', value: { lang: 'fr-CA', value: 'fou' } }, // +1+2+18+2+2+5+2+3=35 (117)
            { tag: C.DATE_TIME, name: 'date-time', value: date } // +1+2+9+2+11=25 (142)
          ] }
        ]
      } // end tag: +1 (143)
      var len = ipp[type].encodingLength(obj)
      t.deepEqual(len, 143)
      t.end()
    })

    test(type + ' data', function (t) {
      var obj = { data: new Buffer('foo') }
      var len = ipp[type].encodingLength(obj)
      t.deepEqual(len, 12)
      t.end()
    })

    test(type + ' data + groups', function (t) {
      var obj = { // version + statusCode + operationId/requestId: +8
        groups: [
          { tag: 1, attributes: [ // +1 (9)
            { tag: C.KEYWORD, name: 'string', value: 'foo' } // +1+2+6+2+3=14 (23)
          ] }
        ],
        data: new Buffer('foo') // +3 (26)
      } // end tag: +1 (27)
      var len = ipp[type].encodingLength(obj)
      t.deepEqual(len, 27)
      t.end()
    })
  })
})

test('encode', function (t) {
  t.test('request', function (t) {
    t.test('minimal', function (t) {
      var obj = {
        operationId: C.PRINT_JOB,
        requestId: 42
      }
      var encoded = ipp.request.encode(obj)
      var expected = new Buffer('010100020000002a03', 'hex')
      t.deepEqual(encoded, expected)
      t.end()
    })
  })

  t.test('response', function (t) {
    t.test('minimal', function (t) {
      var obj = {
        statusCode: C.SERVER_ERROR_VERSION_NOT_SUPPORTED,
        requestId: 42
      }
      var encoded = ipp.response.encode(obj)
      var expected = new Buffer('010105030000002a03', 'hex')
      t.deepEqual(encoded, expected)
      t.end()
    })

    t.test('custom version', function (t) {
      var obj = {
        version: { major: 2, minor: 0 },
        statusCode: C.SUCCESSFUL_OK,
        requestId: 42
      }
      var encoded = ipp.response.encode(obj)
      var expected = new Buffer('020000000000002a03', 'hex')
      t.deepEqual(encoded, expected)
      t.end()
    })

    test('groups', function (t) {
      var date = new Date(2015, 11, 1, 1, 23, 45, 678)
      var sign = date.getTimezoneOffset() > 0 ? '2d' : '2b'
      var zone = new Buffer(2)
      zone.writeInt8(date.getTimezoneOffset() / 60, 0)
      zone.writeInt8(date.getTimezoneOffset() % 60, 1)
      var dateHex = '07df0c0101172d06' + sign + zone.toString('hex')

      var obj = {
        statusCode: C.SUCCESSFUL_OK,
        requestId: 42,
        groups: [
          { tag: C.OPERATION_ATTRIBUTES_TAG, attributes: [
            { tag: C.KEYWORD, name: 'string', value: 'foo' },
            { tag: C.KEYWORD, name: 'array', value: ['foo', 'bar'] },
            { tag: C.BOOLEAN, name: 'bool', value: true },
            { tag: C.ENUM, name: 'enum', value: 42 }
          ] },
          { tag: C.JOB_ATTRIBUTES_TAG, attributes: [
            { tag: C.KEYWORD, name: 'string', value: ['foo'] },
            { tag: C.NAME_WITH_LANG, name: 'name-with-language', value: { lang: 'fr-CA', value: 'fou' } },
            { tag: C.DATE_TIME, name: 'date-time', value: date }
          ] }
        ]
      }
      var encoded = ipp.response.encode(obj)
      var expected = new Buffer(
        '0101' + // version
        '0000' + // statusCode
        '0000002a' + // requestId
        '01' + // delimiter tag
          '44' + // value tag
            '0006' + // name length
            '737472696e67' + // name
            '0003' + // value length
            '666f6f' + // value
          '44' + // value tag
            '0005' + // name length
            '6172726179' + // name
            '0003' + // value length
            '666f6f' + // value
          '44' + // value tag
            '0000' + // name length
            '' + // name
            '0003' + // value length
            '626172' + // value
          '22' + // value tag
            '0004' + // name length
            '626f6f6c' + // name
            '0001' + // value length
            '01' + // value
          '23' + // value tag
            '0004' + // name length
            '656e756d' + // name
            '0004' + // value length
            '0000002a' + // value
        '02' + // delimiter tag
          '44' + // value tag
            '0006' + // name length
            '737472696e67' + // name
            '0003' + // value length
            '666f6f' + // value
          '36' + // value tag
            '0012' + // name length
            '6e616d652d776974682d6c616e6775616765' + // name
            '000c' + // value length
            '0005' + // sub-value length
            '66722d4341' + // sub-value
            '0003' + // sub-value length
            '666f75' + // name
          '31' + // value tag
            '0009' + // name length
            '646174652d74696d65' + // name
            '000b' + // value length
            dateHex + // value
        '03', // end of attributes tag
        'hex')
      t.deepEqual(encoded, expected)
      t.end()
    })

    test('data', function (t) {
      var obj = {
        statusCode: C.SUCCESSFUL_OK, // +2 (4)
        requestId: 42, // +4 (8)
        data: new Buffer('foo')
      }
      var encoded = ipp.response.encode(obj)
      var expected = new Buffer(
        '0101' + // version
        '0000' + // statusCode
        '0000002a' + // requestId
        '03' + // end of attributes tag
        '666f6f', // data
        'hex')
      t.deepEqual(encoded, expected)
      t.end()
    })

    test('data + groups', function (t) {
      var obj = { // version: 2
        statusCode: C.SUCCESSFUL_OK, // +2 (4)
        requestId: 42, // +4 (8)
        groups: [
          { tag: C.JOB_ATTRIBUTES_TAG, attributes: [ // +1 (64)
            { tag: C.KEYWORD, name: 'string', value: 'foo' } // +1+2+6+2+3=14 (78)
          ] }
        ],
        data: new Buffer('foo')
      } // end tag: +1 (79)
      var encoded = ipp.response.encode(obj)
      var expected = new Buffer(
        '0101' + // version
        '0000' + // statusCode
        '0000002a' + // requestId
        '02' + // delimiter tag
          '44' + // value tag
            '0006' + // name length
            '737472696e67' + // name
            '0003' + // value length
            '666f6f' + // value
        '03' + // end of attributes tag
        '666f6f', // data
        'hex')
      t.deepEqual(encoded, expected)
      t.end()
    })
  })
})

test('decode', function (t) {
  t.test('request', function (t) {
    t.test('minimal', function (t) {
      var data = new Buffer('0101000a0000002a03', 'hex')
      var expected = {
        version: { major: 1, minor: 1 },
        operationId: 10,
        requestId: 42,
        groups: [],
        data: new Buffer(0)
      }
      var decoded = ipp.request.decode(data)
      t.deepEqual(decoded, expected)
      t.end()
    })

    t.test('truncated', function (t) {
      var data = new Buffer('0101000a0000002a', 'hex')
      t.throws(function () {
        ipp.request.decode(data)
      })
      t.end()
    })
  })
})

test('encode -> decode', function (t) {
  var encodeDate = new Date(2015, 11, 1, 1, 23, 45, 678)
  var decodeDate = new Date(2015, 11, 1, 1, 23, 45, 600)
  var obj = {
    version: { major: 1, minor: 0 },
    statusCode: C.SUCCESSFUL_OK,
    requestId: 42,
    groups: [
      { tag: C.OPERATION_ATTRIBUTES_TAG, attributes: [
        { tag: C.KEYWORD, name: 'string', value: ['foo'] },
        { tag: C.KEYWORD, name: 'array', value: ['foo', 'bar'] },
        { tag: C.BOOLEAN, name: 'bool', value: [true] },
        { tag: C.ENUM, name: 'enum', value: [42] }
      ] },
      { tag: C.JOB_ATTRIBUTES_TAG, attributes: [
        { tag: C.KEYWORD, name: 'string', value: ['foo'] },
        { tag: C.DATE_TIME, name: 'date-time', value: [encodeDate] }
      ] }
    ],
    data: new Buffer('foo')
  }
  var encoded = ipp.response.encode(obj)
  obj.groups[1].attributes[1].value[0] = decodeDate
  var decoded = ipp.response.decode(encoded)
  t.deepEqual(decoded, obj)
  t.end()
})
