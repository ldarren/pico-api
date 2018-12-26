const pico = require('pico-common/bin/pico-cli')
const { series } = pico.export('pico/test')
const pUtil = require('picos-util')
const picos = require('../index')

series('client/sandbox only', function(){
	this.begin(next => {
		picos({path: ['config/pico.test.json'], dir: ['test'], master: [false]}, (err, ctx, cfg) => {
			next(err, [ctx, cfg])
		})
	})

	this.end((ctx, cfg, next) => {
		ctx.quit()
		next()
	})

	this.test('ensure server is setup correctly', (ctx, cfg, next) => {
		next(null, ctx != null)
	})

	this.test('ensure server is running correctly', (ctx, cfg, next) => {
		pUtil.ajax('GET', 'http://localhost:4888/pico', null, null, (err, state, res) => {
			if (4 !== state) return
			if (err) return next(err)
			const delta = Date.now() - parseInt(res)
			next(null, delta < 1000)
		})
	})
})
