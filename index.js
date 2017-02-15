#!/usr/bin/env node

const
mods= require('./lib/mods'),
cfg= require('./lib/cfg')

mods.load(cfg.parse(__dirname), (err, context)=>{
    if (err) return console.error(err)
})
