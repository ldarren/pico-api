var
sep = function(session, models, next){console.log('###'); return next()},
route=function(session, models, next){
    switch(session.req.method){
    case 'POST': return next()
    case 'GET': session.setOutput(session.time)
    default: return next(null, this.sigslot.abort())
    }
},
help=function(session, models, next){
    next(`api ${this.api} is not supported yet`)
},
all = {
    setup: function(context, next){
        var
        sigslot=context.sigslot,
        web=context.webServer,
        appMgr=context.appMgr

        sigslot.slot('', [help])
        sigslot.slot('ERR/', [web.error])
        sigslot.slot('END/', [web.render])
        sigslot.slot('/pdl', [appMgr.redirect])
        sigslot.slot('/pico', [route,web.parse])

        sigslot.slot('pico/add/app', [help])
        next()
    }
}

module.exports = [
    all
]
