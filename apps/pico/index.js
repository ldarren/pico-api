var
sep = function(session, models, next){console.log('###'); return next()},
route=function(session, models, next){
    switch(session.req.method){
    case 'POST': return next()
    case 'GET':
        var time=models.get('time')
        time.now=session.time
        var err=session.addJob(models, [session.job('time','now')])
    default: return next(err, 'END')
    }
},
addApp=function(session, models, next){
    console.log(JSON.stringify(models))
    next()
},
all = {
    setup: function(context, next){
        var
        sigslot=context.sigslot,
        web=context.webServer,
        appMgr=context.appMgr

        sigslot.slot('ERR/*', [web.error])
        sigslot.slot('END', [web.render])
        sigslot.slot('/pdl', [appMgr.redirect])
        sigslot.slot('/pico', [route,web.parse])

        sigslot.slot('pico/add/app', [addApp, web.render])
        next()
    }
}

module.exports = [
    all
]
