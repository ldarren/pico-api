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

        sigslot.slot('pico/add/app', [web.parse, addApp, web.render])
        sigslot.slot('err/*', [web.error])
        sigslot.slot('/urs', [appMgr.redirect])
        next()
    }
}

module.exports = [
    all
]
