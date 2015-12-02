'use strict'

var C = require('./constants')

exports.CONSTANTS = C
exports.STATUS_CODES = require('./status-codes')

exports.request = {
  decode: function () {
    var obj = decode.apply(null, arguments)
    exports.request.decode.bytes = decode.bytes
    obj.operationId = obj._oprationIdOrStatusCode
    delete obj._oprationIdOrStatusCode
    return obj
  },
  encode: encode,
  encodingLength: encodingLength
}

exports.response = {
  decode: function () {
    var obj = decode.apply(null, arguments)
    exports.response.decode.bytes = decode.bytes
    obj.statusCode = obj._oprationIdOrStatusCode
    delete obj._oprationIdOrStatusCode
    return obj
  },
  encode: encode,
  encodingLength: encodingLength
}

function decode (buf, offset, len) {
  if (!offset) offset = 0
  if (!len) len = buf.length
  var oldOffset = offset

  var obj = {
    version: {},
    groups: []
  }

  obj.version.major = buf.readInt8(offset++)
  obj.version.minor = buf.readInt8(offset++)
  obj._oprationIdOrStatusCode = buf.readInt16BE(offset)
  offset += 2
  obj.requestId = buf.readInt32BE(offset)
  offset += 4

  // attribute groups
  var tag = buf.readInt8(offset++) // delimiter-tag
  while (tag !== C.END_OF_ATTRIBUTES_TAG && offset < len) {
    var group = { tag: tag, attributes: [] }

    // attribute-with-one-value or additional-value
    tag = buf.readInt8(offset++) // value-tag
    while (tag > 0x0f) {
      var name = str.decode(buf, offset)
      offset += str.decode.bytes

      var val
      switch (tag) {
        case C.INTEGER:
          val = tint.decode(buf, offset)
          offset += tint.decode.bytes
          break
        case C.BOOLEAN:
          val = tbool.decode(buf, offset)
          offset += tbool.decode.bytes
          break
        case C.ENUM:
          val = tenum.decode(buf, offset)
          offset += tenum.decode.bytes
          break
        case C.DATE_TIME:
          val = tdatetime.decode(buf, offset)
          offset += tdatetime.decode.bytes
          break
        case C.TEXT_WITH_LANG:
        case C.NAME_WITH_LANG:
          val = langstr.decode(buf, offset)
          offset += langstr.decode.bytes
          break
        default:
          val = str.decode(buf, offset)
          offset += str.decode.bytes
      }

      if (!name) {
        attr.value.push(val)
      } else {
        var attr = { tag: tag, name: name, value: [val] }
        group.attributes.push(attr)
      }

      tag = buf.readInt8(offset++) // delimiter-tag or value-tag
    }

    obj.groups.push(group)
  }

  obj.data = buf.slice(offset, len)

  decode.bytes = len - oldOffset

  return obj
}

function encode (obj, buf, offset) {
  if (!buf) buf = new Buffer(encodingLength(obj))
  if (!offset) offset = 0
  var oldOffset = offset

  buf.writeInt8(obj.version ? obj.version.major : 1, offset++)
  buf.writeInt8(obj.version ? obj.version.minor : 1, offset++)

  buf.writeInt16BE(obj.statusCode === undefined ? obj.operationId : obj.statusCode, offset)
  offset += 2

  buf.writeInt32BE(obj.requestId, offset)
  offset += 4

  if (obj.groups) {
    obj.groups.forEach(function (group) {
      buf.writeInt8(group.tag, offset++)

      group.attributes.forEach(function (attr) {
        var value = Array.isArray(attr.value) ? attr.value : [attr.value]
        value.forEach(function (val, i) {
          buf.writeInt8(attr.tag, offset++)

          str.encode(i ? '' : attr.name, buf, offset)
          offset += str.encode.bytes

          switch (attr.tag) {
            case C.INTEGER:
              tint.encode(val, buf, offset)
              offset += tint.encode.bytes
              break
            case C.BOOLEAN:
              tbool.encode(val, buf, offset)
              offset += tbool.encode.bytes
              break
            case C.ENUM:
              tenum.encode(val, buf, offset)
              offset += tenum.encode.bytes
              break
            case C.DATE_TIME:
              tdatetime.encode(val, buf, offset)
              offset += tdatetime.encode.bytes
              break
            case C.TEXT_WITH_LANG:
            case C.NAME_WITH_LANG:
              langstr.encode(val, buf, offset)
              offset += langstr.encode.bytes
              break
            default:
              str.encode(val, buf, offset)
              offset += str.encode.bytes
          }
        })
      })
    })
  }

  buf.writeInt8(C.END_OF_ATTRIBUTES_TAG, offset++)

  if (obj.data) offset += obj.data.copy(buf, offset)

  encode.bytes = offset - oldOffset

  return buf
}

function encodingLength (obj) {
  var len = 8 // version-number + status-code + request-id

  if (obj.groups) {
    len += obj.groups.reduce(function (len, group) {
      len += 1 // begin-attribute-group-tag
      len += group.attributes.reduce(function (len, attr) {
        var value = Array.isArray(attr.value) ? attr.value : [attr.value]
        len += value.reduce(function (len, val) {
          len += 1 // value-tag
          len += str.encodingLength(len === 1 ? attr.name : '')

          switch (attr.tag) {
            case C.INTEGER: return len + tint.encodingLength(val)
            case C.BOOLEAN: return len + tbool.encodingLength(val)
            case C.ENUM: return len + tenum.encodingLength(val)
            case C.DATE_TIME: return len + tdatetime.encodingLength(val)
            case C.TEXT_WITH_LANG:
            case C.NAME_WITH_LANG: return len + langstr.encodingLength(val)
            default: return len + str.encodingLength(val)
          }
        }, 0)

        return len
      }, 0)
      return len
    }, 0)
  }

  len++ // end-of-attributes-tag

  if (obj.data) len += obj.data.length

  return len
}

var tint = {}

tint.decode = function (buf, offset) {
  var i = buf.readInt32BE(offset + 2)
  tint.decode.bytes = 6
  return i
}

tint.encode = function (i, buf, offset) {
  buf.writeInt16BE(4, offset)
  buf.writeInt32BE(i, offset + 2)
  tint.encode.bytes = 6
  return buf
}

tint.encodingLength = function (s) {
  return 6
}

var tenum = {}

tenum.decode = function (buf, offset) {
  var i = buf.readInt32BE(offset + 2)
  tenum.decode.bytes = 6
  return i
}

tenum.encode = function (i, buf, offset) {
  buf.writeInt16BE(4, offset)
  buf.writeInt32BE(i, offset + 2)
  tenum.encode.bytes = 6
  return buf
}

tenum.encodingLength = function (s) {
  return 6
}

var tbool = {}

tbool.decode = function (buf, offset) {
  var b = buf.readInt8(offset + 2) === C.TRUE
  tbool.decode.bytes = 3
  return b
}

tbool.encode = function (b, buf, offset) {
  buf.writeInt16BE(1, offset)
  buf.writeInt8(b ? C.TRUE : C.FALSE, offset + 2)
  tbool.encode.bytes = 3
  return buf
}

tbool.encodingLength = function (s) {
  return 3
}

var langstr = {}

langstr.decode = function (buf, offset) {
  var oldOffset = offset
  offset += 2
  var lang = str.decode(buf, offset)
  offset += str.decode.bytes
  var val = str.decode(buf, offset)
  offset += str.decode.bytes
  langstr.decode.bytes = offset - oldOffset
  return { lang: lang, value: val }
}

langstr.encode = function (obj, buf, offset) {
  str.encode(obj.lang, buf, offset + 2)
  var len = str.encode.bytes
  str.encode(obj.value, buf, offset + 2 + len)
  len += str.encode.bytes
  buf.writeInt16BE(len, offset)
  langstr.encode.bytes = len + 2
  return buf
}

langstr.encodingLength = function (obj) {
  return Buffer.byteLength(obj.lang) + Buffer.byteLength(obj.value) + 6
}

var str = {}

str.decode = function (buf, offset) {
  var len = buf.readInt16BE(offset)
  var s = buf.toString('utf-8', offset + 2, offset + 2 + len)
  str.decode.bytes = len + 2
  return s
}

str.encode = function (s, buf, offset) {
  var len = buf.write(s, offset + 2)
  buf.writeInt16BE(len, offset)
  str.encode.bytes = len + 2
  return buf
}

str.encodingLength = function (s) {
  return Buffer.byteLength(s) + 2
}

var tdatetime = {}

tdatetime.decode = function (buf, offset) {
  var drift = (buf.readInt8(offset + 11) * 60) + buf.readInt8(offset + 12)
  if (buf.slice(offset + 10, offset + 11) === '+') drift = drift * -1

  var d = new Date(Date.UTC(
    buf.readInt16BE(offset + 2),
    buf.readInt8(offset + 4) - 1,
    buf.readInt8(offset + 5),
    buf.readInt8(offset + 6),
    buf.readInt8(offset + 7) + drift,
    buf.readInt8(offset + 8),
    buf.readInt8(offset + 9) * 100
  ))

  tdatetime.decode.bytes = 13

  return d
}

tdatetime.encode = function (d, buf, offset) {
  buf.writeInt16BE(11, offset)
  buf.writeInt16BE(d.getFullYear(), offset + 2)
  buf.writeInt8(d.getMonth() + 1, offset + 4)
  buf.writeInt8(d.getDate(), offset + 5)
  buf.writeInt8(d.getHours(), offset + 6)
  buf.writeInt8(d.getMinutes(), offset + 7)
  buf.writeInt8(d.getSeconds(), offset + 8)
  buf.writeInt8(Math.floor(d.getMilliseconds() / 100), offset + 9)
  buf.write(d.getTimezoneOffset() > 0 ? '-' : '+', offset + 10)
  buf.writeInt8(d.getTimezoneOffset() / 60, offset + 11)
  buf.writeInt8(d.getTimezoneOffset() % 60, offset + 12)

  tdatetime.encode.bytes = 13

  return buf
}

tdatetime.encodingLength = function (s) {
  return 13
}
