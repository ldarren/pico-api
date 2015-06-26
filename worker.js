var
pico= require('pico-common'),
utils= require('./lib/utils')

    pico.start({
        name:'worker',
        production:false,
        ajax:utils.ajax,
        paths:{
            '*':'http://localhost/'
        }
    },function(){
        var hello=require('hello')
console.log('loading...')
        me.slot('load', function(){
            console.log('loaded')
            hello.said()
        })
    })
