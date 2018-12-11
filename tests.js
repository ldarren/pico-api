const pico =require('pico-common/bin/pico-cli')
const { test } = pico.export('pico/test')
const pUtil = require('picos-util')
const picos = require('./index')

picos({path: ['config/pico.test.json'], master: [false]}, (err, ctx) => {
	test('ensure server is setup correctly', cb => {
		cb(err, ctx !== undefined)
	})
	test('ensure server is running correctly', cb => {
		pUtil.ajax('GET', 'http://localhost:4888/pico', null, null, (err, state, res) => {
			if (4 !== state) return
			if (err) return cb(err, ctx !== undefined)
			const delta = Date.now() - parseInt(res)
			cb(err, delta < 1000)
		})
	})
})
