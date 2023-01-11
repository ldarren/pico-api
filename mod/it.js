const pico = require('pico-common/bin/pico-cli')
const {series, parallel} = pico.export('pico/test')

module.exports = {
	setup(host, cfg, rsc, paths){
	},
	parallel(desc, func){
		parallel(desc, func(this))
	},
	series(desc, func){
		series(desc, func(this))
	}
}
