var
Models=require('./Models'),
SigSlot=function(){
    this.slots= {}
},
wildcard=function(path, slots){
    if (!path.length) return
    path.pop()
    return slots[path.join('/')] || wildcard(path, slots)
},
run=function(route, idx, ctx, evt, models, cb){
    if (route.length <= idx) return cb()
    route[idx++].call(ctx, evt, models, function(err, api){
        if (err) return cb(err)
        if (api) return cb(null, api)
        run(route, idx, ctx, evt, models, cb)
    })
},
proc=function(routes, idx, ctx, evt, models){
    if (routes.length <= idx) return
    run(routes[idx++], 0, ctx, evt, models, function(err, api){
        if (err) return ctx.sigslot.assert(ctx.api, evt, err)
        if (api) return ctx.sigslot.signal(api,evt,models)
        proc(routes, idx, ctx, evt, models)
    })
}

SigSlot.prototype= {
    slot: function(api, funcs){
        var
        slots=this.slots,
        routes=slots[api]||[]
        routes.push(funcs)
        slots[api]= routes
    },
    signal: function(api, evt, models){
        if (!evt) return console.error('no evt')
        var routes = this.slots[api]
        if (!routes){
            routes=wildcard(api.split('/'), this.slots)
        }

        if (!routes) return this.assert(api, evt, 'routes['+api+'] not found')
        proc(routes, 0, {api:api,sigslot:this}, evt, models||new Models)
    },
    assert:function(api, evt, err){
        if (0 === api.indexOf('ERR/')) return console.error(err)
        this.signal('ERR/'+api, evt, err)
    },
    abort:function(api){
        return 'END/'+(api||'')
    }
}

module.exports= SigSlot
