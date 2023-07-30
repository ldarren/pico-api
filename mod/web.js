const http = require('node:http')
const URL = require('node:url')
const qs = require('node:querystring')
const multipart = require('./multipart')

const RAW = Symbol.for('raw')
const OPTIONS = 'OPTIONS'
const HAS_DATA = obj => obj && (Array.isArray(obj) || Object.keys(obj).length)
const CREATE_BODY = (body, meta) => JSON.stringify(Object.assign({}, meta, {body}))
const GET_CONTENT_TYPE = (value = '') => value.split(';')[0].trim().toLowerCase()

module.exports = {
	setup(cfg, rsc, paths){
		const cors = cfg.cors
		const headers = [
			'Access-Control-Allow-Origin', cors,
			'Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE, CONNECT, PATCH',
			'Access-Control-Allow-Headers', '*',
			// 30 days
			'Access-Control-Max-Age', 2592000
		]
		http.createServer((req, res) => {
			if (cors){
				for (let i = 0, l = headers.length; i < l; i += 2){
					res.setHeader(headers[i], headers[i + 1])
				}
			}
			if (OPTIONS === req.method.toUpperCase()){
				res.writeHead(204, headers)
				res.end()
				return
			}
			const url = URL.parse(req.url, 1)
			this.go(url.pathname, {req, res, url})
		}).listen(cfg.port, cfg.host, () => process.stdout.write(`listening to ${cfg.host}:${cfg.port}\n`))
	},

	queryParser(req, query){
		Object.assign(query, URL.parse(req.url, true).query)
		return this.next()
	},

	async bodyParser(req, body, contentType){
		const err = await (new Promise((resolve, reject) => {
			const arr = []

			req.on('data', chuck => {
				arr.push(chuck)

				// Too much POST data, kill the connection!
				if (arr.length > 128) req.connection.destroy()
			})
			req.on('error',err => {
				reject(err)
			})
			req.on('end', () => {
				const str = Buffer.concat(arr).toString()
				const raw = {[RAW]: str}
				try{
					switch(contentType ?? GET_CONTENT_TYPE(req.headers['content-type'])){
					case 'application/x-www-form-urlencoded': Object.assign(body, qs.parse(str), raw); break
					case 'text/plain': Object.assign(body, raw); break
					// some client default to json without content type to prevent
					case '':
					case 'application/json': Object.assign(body, JSON.parse(str), raw); break
					default: Object.assign(body, raw); break
					}
				}catch(exp){
					Object.assign(body, raw)
				}
				resolve()
			})
		}))
		return this.next(err)
	},

	async parse(req, body){
		const ct = GET_CONTENT_TYPE(req.headers['content-type'])

		switch(ct){
		case '':
			await module.exports.queryParser.call(this, req, body)
			break
		case 'multipart/form-data':
			{
				const promise = new Promise((resolve, reject) => {
					multipart.parse(req, (err, data) => {
						if (err) return reject(err)
						Object.assign(body, data)
						resolve()
					})
				})
				await promise
			}
			return this.next()
		default:
			await module.exports.bodyParser.call(this, req, body, ct)
			break
		}
	},

	output: (contentType = 'application/json', dataType = 'json') => {
		let hasData = HAS_DATA
		let createBody = CREATE_BODY
		switch(dataType){
		case 'text':
			hasData = data => !!data
			createBody = body => body.charAt ? body : JSON.stringify(body)
			break
		case 'xml':
			// TODO obj to xml
			createBody = body => '<xml></xml>'
			break
		case 'bin':
			createBody = body => String.fromCharCode.apply(null, body[0])
			break
		}

		let headers = {}
		Object.assign(headers, {'Content-Type': contentType})

		return async function(res, output, meta, head = {headers: {}}){
			if (!res || !res.end) return this.next()

			try {
				await this.next()
				if (hasData(output) || hasData(meta)) {
					res.writeHead(head.status || 200, Object.assign(headers, head.headers))
					res.end(createBody(output, meta))
				} else {
					res.writeHead(head.status || 200, head.headers)
					res.end()
				}
			} catch(exp) {
				if (exp.isAxiosError){
					console.error(exp.toJSON())
				} else {
					console.error(exp)
				}
				// exp in head format? {status, headers, message}
				const status = exp.status || 500
				res.writeHead(status, exp.headers)
				res.end(exp.message ? JSON.stringify(exp.message) : http.STATUS_CODES[status])
			}
		}
	},
}
