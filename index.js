#!/usr/bin/env node

// In case picos was installed globally
process.env.NODE_PATH = process.cwd() + '/node_modules'
const book = require('./src/book')
const pipeline = require('./src/pipeline')

function run(opt, cb){
	book.open(opt.dir + opt.service, (err, service) => {
		if (err) return cb(err)
		pipeline.run(service)
	})
}

// Is run from cmd?
if (require.main === module) {
	const args = require('pico-args')
	const opt = args.parse({
		dir: ['service/', 'service directory'],
		d: '@dir',
		service: ['sample/index', 'json script'],
		s: '@service'
	})
	run(opt, err => {
		if (err) return console.error(err)
	})
}

module.exports = run
