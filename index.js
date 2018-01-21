#!/usr/bin/env node

// in case picos was installed globally
process.env.NODE_PATH = process.cwd()+'/node_modules'

const cfg = require('./lib/cfg')
const options = cfg.parse(__dirname)

if (options && !options.app.master) return require('./lib/app')

const mods = require('./lib/mods')

mods.load(options, (err, context) => {
    if (err) return console.error(err)
})
