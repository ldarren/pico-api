#!/usr/bin/env node

const
mods= require('./lib/mods'),
cfg= require('./lib/cfg')

console.log(__dirname,process.cwd())

mods.load(cfg.parse(__dirname), (err, context)=>{
    if (err) return console.error(err)
})
