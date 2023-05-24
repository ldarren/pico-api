const pico = require('pico-common/bin/pico-cli')
const {series} = pico.export('pico/test')
const pUtil = require('picos-util')
const picos = require('../index')

series('client/sandbox only', function(){
	this.begin(next => {
		picos({service: './service.json', mod: 'test'}, (err, ctx) => {
			next(err, [ctx])
		})
	})

	this.end((ctx, next) => {
		next()
	})

	this.test('ensure server is setup correctly', (ctx, next) => {
		next(null, ctx != null)
	})

	this.test('ensure server is running correctly', (ctx, next) => {
		pUtil.ajax('GET', 'http://127.0.0.1:4888/pico', null, null, (err, state, res) => {
			if (4 !== state) return
			if (err) return next(err)
			const delta = Date.now() - res
			next(null, delta < 1000)
		})
	})

})
