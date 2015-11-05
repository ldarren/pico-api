var
Session=require('./Session'),
Models=require('./Models'),
SigSlot=function(){
    this.slots= {}
},
wildcard=function(path, slots){
    if (!path.length) return
    path.pop()
    return slots[path.join('/')] || wildcard(path, slots)
},
run=function(route, idx, ctx, models, cb){
    if (route.length <= idx) return cb()
    var
    funcs=route[idx++],
    func=funcs[0],
    args=[]

    for(var i=1,l=funcs.length; i<l; i++){
        args.push(models.get(funcs[i]))
    }

    args.push(function(err, api){
        if (err || api) return cb(err, api)
        run(route, idx, ctx, models, cb)
    })

    func.apply(ctx, args)
},
proc=function(routes, idx, ctx, models)
    if (routes.length <= idx) return
    run(routes[idx++], 0, ctx, models, function(err, api){
        if (err) return ctx.sigslot.assert(ctx.api, err)
        if (api) return ctx.sigslot.signal.apply(ctx.sigslot, Array.prototype.slice.call(arguments, 1))
        proc(routes, idx, ctx)
    })
}

SigSlot.prototype= {
    slot: function(api, funcs){
        var
        slots=this.slots,
        routes=slots[api]=slots[api]||[]
        routes.push(funcs)
    },
    signal: function(api, type){
        if (!evt) return console.error('no evt')
        var routes = this.slots[api] || wildcard(api.split('/'), this.slots)

        if (!routes) return this.assert(api, evt, `routes[${api}] not found`)
        evt.api=api
        evt.sigslot=this
        proc(routes, 0, new Session(api, this), new Models(type, Array.prototype.slice(arguments, arguments.callee.length)))
    },
    assert:function(api, err){
        if (0 === api.indexOf('ERR/')) return console.error(err)
        this.signal('ERR/'+api, 'error', err)
    },
    abort:function(api){
        return 'END/'+(api||'')
    }
}

module.exports= SigSlot
