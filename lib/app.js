var
pico= require('pico-common'),
mods= require('./mods'),
utils= require('./utils')

mods.load(__dirname, '../config/urs.json', function(err, context, config){
    if (err) return console.error(err)

    config.ajax=utils.ajax

    pico.run(config,function(){
        var hello=require('hello')
        this.load=function(){
            hello.said()
        }
    })
})
