const pico = require('pico-common')
const psUtil = require('picos-util')
const args = require('pico-args')
const pipeline = require('./src/pipeline')

const opt = args.parse({
	name: ['stub', 'service name'],
	n: '@name',
	dir: ['service/', 'service directory'],
	d: '@dir',
	service: ['sample', 'json script'],
	s: '@service'
})

pico.run({
	name: opt.name,
	ajax: psUtil.ajax,
	paths: {
		'~': `./${opt.dir}`,
		'@': `${opt.dir + opt.service}/`
	},
	env: {
		pipeline
	},
	preprocessors: {
	},
	importRule: []
}, () => {
	const pipeline = define('pipe.line', pico.env('pipeline'))
	const service = require('@/index')

	return function(){
		pipeline.run(service)
	}
})
