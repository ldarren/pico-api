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
    console.log('hello')
})
