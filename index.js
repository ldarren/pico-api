#!/usr/bin/env node

// In case picos was installed globally
process.env.NODE_PATH = process.cwd() + '/node_modules'
const book = require('./src/book')
const pipeline = require('./src/pipeline')

function run(opt, cb){
	book.open(opt.service, async (err, service) => {
		if (err) return cb(err)
		cb(null, await pipeline.run(service, opt.mod, opt.ratelimit))
	})
}

// Is run from cmd?
if (require.main === module) {
	const args = require('pico-args')
	const opt = args.parse({
		service: ['service/index', 'path to service script'],
		s: '@service',
		mod: ['mod/', 'module path'],
		m: '@service',
		ratelimit: [64, 'ratelimit'],
		r: '@ratelimit'
	})
	run(opt, err => {
		if (err) return console.error(err)
	})
}

module.exports = run
