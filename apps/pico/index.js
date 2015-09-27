var
sep = function(session, order, next){console.log('###'); return next()},
addApp=function(session, order, next){
    console.log(JSON.stringify(order))
    next()
},
all = {
    setup: function(context, next){
        var
        sigslot=context.sigslot,
        web=context.webServer

        sigslot.slot('pico/add/app', [web.parse, addApp])
        next()
    }
}

module.exports = [
    all
]
