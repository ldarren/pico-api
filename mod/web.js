const http = require('http')
const URL = require('url')
const qs = require('querystring')

const RAW = Symbol.for('raw')
const HAS_DATA = obj => obj && (Array.isArray(obj) || Object.keys(obj).length)
const CREATE_BODY = (body, meta) => JSON.stringify(Object.assign({}, meta, {body}))

module.exports = {

	setup(host, cfg, rsc, paths){
		http.createServer((req, res) => {
			const url = URL.parse(req.url, 1)
			host.go(url.pathname, {req, res, url})
		}).listen(cfg.port, cfg.host, () => process.stdout.write(`listening to ${cfg.host}:${cfg.port}\n`))
	},

	queryParser(req, query){
		Object.assign(query, URL.parse(req.url, true).query)
		return this.next()
	},

	async bodyParser(req, body){
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
					switch(req.headers['content-type']){
					case 'application/x-www-form-urlencoded': Object.assign(body, qs.parse(str), raw); break
					case 'text/plain': Object.assign(body, raw); break
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

	output: (contentType = 'application/json', dataType = 'json') => {
		let hasData = HAS_DATA
		let createBody = CREATE_BODY
		switch(dataType){
		case 'text':
			hasData = data => data && data.charAt && data.length
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

		return async function(res, output, meta){
			if (!res || !res.end) return this.next()

			try {
				await this.next()
				if (hasData(output) || hasData(meta)) {
					res.writeHead(200, headers)
					res.end(createBody(output, meta))
				} else {
					res.writeHead(204)
					res.end()
				}
			} catch(exp) {
				console.error(exp)
				res.writeHead(500, exp.message || exp)
				res.end(exp.message || exp)
			}
		}
	},
}
