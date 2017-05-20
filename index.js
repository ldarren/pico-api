#!/usr/bin/env node
// in code picos was install globally
process.env.NODE_PATH=process.cwd()+'/node_modules'

const
mods= require('./lib/mods'),
cfg= require('./lib/cfg'),
options=cfg.parse(__dirname)

if (options && !options.app.master) return require('./lib/app')

mods.load(options, (err, context)=>{
    if (err) return console.error(err)
})
