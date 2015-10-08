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
        web=context.webServer,
        appMgr=context.appMgr

        sigslot.slot('err/*', [web.error])
        sigslot.slot('/pdl', [appMgr.redirect])
        sigslot.slot('/pico', [web.parse])

        sigslot.slot('pico/add/app', [addApp, web.render])
        next()
    }
}

module.exports = [
    all
]
