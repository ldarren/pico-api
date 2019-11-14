const
// PACKET TYPE
	PT_HEAD = 1,
	PT_CRED = 2,
	PT_BODY = 3,
	RAW = Symbol('raw'),

	crypto = require('crypto'),
	qs = require('querystring'),
	PJSON= require('pico-common').export('pico/json'),
	auth = function(head, body, cb){
		if ((!cullAge && !secretKey) || !body.length) return cb()

		const
			t = head.date,
			dt = Date.now() - t

		if (cullAge && (!t || dt > cullAge || dt < -cullAge)) return cb(`timed error request: api[${head.api}]t[${t}]dt[${dt}]`)

		if (secretKey){
			const hmac = crypto.createHmac('md5', secretKey+t)

			for(let i=0,l=body.length; i<l; i++) hmac.update(body[i])

			const key = hmac.digest('base64')

			if (key !== head.key) return cb(`key error request: api[${head.api}]t[${t}]key[${key}]`)
		}
		cb()
	}

let cullAge, secretKey, sep

module.exports = {
	setup(age, key, delimiter){
		cullAge = age
		secretKey = key
		sep = delimiter
	},
	parseBody(req,cb){
		const body = []

		req.on('data', (chuck)=>{
			body.push(chuck)

			// Too much POST data, kill the connection!
			if (body.length > 128) req.connection.destroy()
		})
		req.on('end', ()=>{
			const str=Buffer.concat(body).toString()
			try{
				switch(req.headers['content-type']){
				case 'application/x-www-form-urlencoded': return cb(null, qs.parse(str))
				case 'text/plain':
				case 'application/json':
					return cb(null, JSON.parse(str))
				default:
					return cb(null, {[RAW]: str})
				}
			}catch(exp){
				cb(null, str)
			}
		})
		req.on('error', (err)=>{
			cb(err)
		})
	},
	parse(req, cb){
		const error = function(err){
			req.pause()
			orders = []
			cb(err)
			cb=void 0
		}

		let
			pt = PT_HEAD,
			endPos = 0,
			sepLen = sep.length,
			orders = [],
			remain = '',
			head, body

		req.on('data', (chunk)=>{
			remain += chunk.toString()
			try{
				while(remain){
					endPos = remain.indexOf(sep)
					if (-1 === endPos) break
					switch(pt){
					case PT_HEAD:
						head = JSON.parse(remain.substring(0, endPos))
						orders.push(head)
						body = []
						pt = (head.len > 0) ? PT_CRED : PT_HEAD
						break
					case PT_CRED:
						head.cred= JSON.parse(remain.substring(0, endPos))
						pt = (head.len > 1) ? PT_BODY : PT_HEAD
						break
					case PT_BODY:
						body.push(remain.substring(0, endPos))
						if (head.len === body.length+1){
							pt = PT_HEAD
							auth(head, body, (err)=>{
								if (err){
									remain = null
									return error(err)
								}
								head.data = PJSON.parse(body)
							})
						}
						break
					}
					remain = remain.substr(endPos+sepLen)
				}
			}catch(exp){
				return error(exp)
			}
		})
		req.on('end', ()=>{
			if (cb) cb(orders.length ? null : 'missing or invalid orders', orders)
		})
	},
	error(query,err){
		// TODO: better error handling
		query = query || {}
		const
			str = JSON.stringify(err),
			t = Date.now(),
			head = secretKey ? {
				api: query.api || '',
				reqId: query.reqId || 0,
				resId: 0,
				len: 0,
				date: t,
				key: crypto.createHmac('md5', secretKey+t).update(str).digest('base64'),
				error:null
			} : {
				api: query.api || '',
				reqId: query.reqId || 0,
				resId: 0,
				len: 0,
				error:null
			}
		return JSON.stringify(head).replace('null',str)+sep
	},
	render(query,data){
		const
			t = Date.now(),
			body = PJSON.stringify(data||{})
		let head

		if(secretKey) {
			const hmac = crypto.createHmac('md5', secretKey+t)
			for(let i=0,l=body.length; i<l; i++) hmac.update(body[i])
			head = {
				api: query.api,
				reqId: query.reqId,
				resId: 0,
				len: body.length,
				date: t,
				key: hmac.digest('base64')
			}
		}else{
			head = {
				api: query.api,
				reqId: query.reqId,
				resId: 0,
				len: body.length
			}
		}

		return JSON.stringify(head)+sep+body.join(sep)+sep
	}
}
