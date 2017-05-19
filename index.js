#!/usr/bin/env node

const
mods= require('./lib/mods'),
cfg= require('./lib/cfg'),
options=cfg.parse(__dirname)

if (options && !options.master) return require('./lib/app')

mods.load(options, (err, context)=>{
    if (err) return console.error(err)
})
