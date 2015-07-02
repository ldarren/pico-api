var
pico= require('pico-common'),
mods= require('./lib/mods'),
utils= require('./lib/utils')

mods.load(__dirname, './config/urs.json', function(err, context, config){
    if (err) return console.error(err)

    config.ajax=utils.ajax

    pico.start(config,function(){
        var hello=require('hello')
        me.slot('load', function(){
            hello.said()
        })
    })
})
