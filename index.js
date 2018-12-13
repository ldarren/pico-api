#!/usr/bin/env node

// in case picos was installed globally
process.env.NODE_PATH = process.cwd()+'/node_modules'
const cfg = require('./lib/cfg')

function run(args, cb){
	const options = cfg.parse(__dirname, args)
	if (options && !options.app.master) {
		const app = require('./lib/app')
		return app(options, cb)
	}

	const mods = require('./lib/mods')

	mods.load(options, cb)
}

require.main === module && run(null, (err, ctx_) => {
	if (err) return console.error(err)
})

module.exports = run
