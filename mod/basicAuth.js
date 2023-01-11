const URL = require('url')

const BASIC = 'Basic '
const BASE64 = 'base64'

module.exports = {

	setup(host, cfg, rsc, paths){
	},

	verify(req, user){
		let key = req.headers.authorization
		if (!key){
			const q = URL.parse(req.url, true).query
			key = q.key
		}
		if (!key || !key.includes(BASIC)) return this.next('invalid credential')
		const b64 = key.substring(BASIC.length)
		const buff = Buffer.from(b64, BASE64)
		const text = buff.toString()
		const cred = text.split(':')

		Object.assign(user, {i: parseInt(cred[0])})
		return this.next()
	},

}
