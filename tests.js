const pico =require('pico-common/bin/pico-cli')
const { ensure } = pico.export('pico/test')
const pUtil = require('picos-util')
const cfg = require('./lib/cfg')
const mods = require('./lib/mods')

mods.load(cfg.parse(__dirname, {path: ['config/pico.test.json']}), (err, context) => {

	ensure('ensure server is setup correctly', cb => {
		cb(err, context !== undefined)
	})
	ensure('ensure server is running correctly', cb => {
		pUtil.ajax('GET', 'http://localhost:4888/pico', null, null, (err, state, res) => {
			if (4 !== state) return
			if (err) return cb(err, context !== undefined)
			const delta = Date.now() - parseInt(res)
			cb(err, delta < 1000)
		})
	})
})
