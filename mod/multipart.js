/**
 * req.on('end') event not firing intermittently. current work around is to trigger end when remaining
 * is emptied. which has a risk of false positive if network lag happened
 */
const
	fs = require('node:fs'),
	moore = require('./buffer-moore')

const
	MULTIPART_START = 1,
	MULTIPART_NAME = 2,
	MULTIPART_FIELD_SPACE = 3,
	MULTIPART_FIELD_VALUE = 4,
	MULTIPART_FILE_TYPE = 5,
	MULTIPART_FILE_SPACE = 6,
	MULTIPART_FILE = 7,
	DRAIN = 'drain',
	// END = 'end',
	DATA = 'data',
	ERR = 'error',
	UTF8 = 'utf8',
	BIN = 'binary',
	FNAME = 'filename',
	SAVED = 'saved',
	NAME = 'name',
	PATH = '/tmp/',
	COL = ':',
	SEMI_COL = ';',
	EQ = '=',
	EMPTY = '',
	SLASH = '/',
	REGEX = /(^"|"$)/gu,
	CRLF = Buffer.from('\r\n'),
	CRLF_LEN = CRLF.length

const
	crlfCharTable = moore.makeCharTable(CRLF),
	crlfOffsetTable = moore.makeOffsetTable(CRLF),
	parseContentType = contentType => {
		const output = {}
		const types = contentType.split(SEMI_COL)
		for(let i = 0,l = types.length,type,arr; i < l; i++){
			type = types[i]
			if (-1 === type.indexOf(EQ)) continue
			arr = type.split(EQ)
			output[arr[0].trim()] = arr[1].replace(REGEX, EMPTY)
		}
		return output
	},
	makeOrder = (order, path, data) => {
		if (!order || !path || void 0 === data) return
		// isFinite is faster than parseInt
		const num = isFinite(data) ? parseInt(data) : NaN
		const arr = path.split(SLASH)
		let container = order
		let key

		while(arr.length > 1){
			key = arr.shift()
			container = container[key] = container[key] || {}
		}
		key = arr[0]
		let val = container[key]
		if (val){
			if (!Array.isArray(val)) val = [val]
			val.push(isNaN(num) ? data : num)
			container[key] = val
		}else{
			container[key] = isNaN(num) ? data : num
		}
	},
	fillFile = (req, chunk, file, sep, charTable, offsetTable) => {
		if (!file) return chunk
		const pos = moore.indexOf(sep, chunk, charTable, offsetTable)
		if (pos < 0){
			if (!file.write(chunk, BIN)) req.pause()
			return void 0
		}
		if (!file.write(chunk.slice(0, pos), BIN)) req.pause()
		return chunk.slice(pos)
	},
	closeFile = (file, order, obj) => {
		if (file){
			makeOrder(order, obj[NAME], {
				[FNAME]: obj[FNAME],
				[SAVED]: obj[SAVED],
				contentType: obj['Content-Type']
			})
			file.end()
		}
	}

module.exports = {
	parse(req, cb){
		const order = {}
		const sep = Buffer.from('--' + parseContentType(req.headers['content-type']).boundary)
		const sepCharTable = moore.makeCharTable(sep)
		const sepOffsetTable = moore.makeOffsetTable(sep)
		let
			remain,remainStr = EMPTY,
			state = MULTIPART_START,
			nextNL, obj, arr, file, key

		// end event don't trigger all the time
		req.on(ERR, () => {
			// cb(null, order)
		})

		req.on(DATA, chunk => {
			remain = fillFile(req, chunk, file, sep, sepCharTable, sepOffsetTable)
			if (remain){
				if (file){
					file = closeFile(file, order, obj)
					state = MULTIPART_START
				}
			} else {
				return
			}
			while(remain && remain.length){
				nextNL = moore.indexOf(CRLF, remain, crlfCharTable, crlfOffsetTable)
				if (nextNL < 0) {
					remainStr += remain.toString()
					remain = void 0
					break
				}
				remainStr += remain.toString(UTF8, 0, nextNL)
				remain = remain.slice(nextNL + CRLF_LEN)
				switch(state){
				case MULTIPART_START:
					if (~remainStr.indexOf(sep)){
						state = MULTIPART_NAME
					}
					break
				case MULTIPART_NAME:
					obj = parseContentType(remainStr)
					if (obj[FNAME]){
						state = MULTIPART_FILE_TYPE

						obj[SAVED] = PATH + Math.random().toString(36).slice(2) + Date.now().toString(36) + obj[FNAME]
						file = fs.createWriteStream(obj[SAVED])
						// eslint-disable-next-line no-loop-func
						file.on(ERR, err => {
							file.end()
							state = -1
							console.error(err)
							return cb(err, order)
						})
						file.on(DRAIN, () => {
							req.resume()
						})
					}else{
						state = MULTIPART_FIELD_SPACE
					}
					break
				case MULTIPART_FIELD_SPACE:
					state = MULTIPART_FIELD_VALUE
					break
				case MULTIPART_FIELD_VALUE:
					key = obj[NAME]
					makeOrder(order, key, remainStr)
					state = MULTIPART_START
					break
				case MULTIPART_FILE_TYPE:
					arr = remainStr.split(COL)
					obj[arr[0]] = arr[1].trim()
					state = MULTIPART_FILE_SPACE
					break
				case MULTIPART_FILE_SPACE:
					state = MULTIPART_FILE
					// Fall through
				case MULTIPART_FILE:
					remain = fillFile(req, remain.slice(nextNL), file, sep, sepCharTable, sepOffsetTable)
					if (remain) {
						file = closeFile(file, order, obj)
						state = MULTIPART_START
					}else{
						return
					}
					nextNL = 0
					break
				default:
					console.error(`upload reach a dead end: ${state}`, obj)
					return cb(`invalid upload state: ${state}`, order)
				}
				remainStr = EMPTY
			}
			cb(null, order)
		})
	}
}
