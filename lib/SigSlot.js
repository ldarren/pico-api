var
SigSlot=function(){
    this.slots= {}
},
wildcard=function(path, slots){
    if (!path.length) return
    path[path.length-1]='*'
    var route=slots[path.join('/')]
    if (route)return route
    path.pop()
    return wildcard(path, slots)
},
run=function(route, idx, ctx, evt, order, cb){
    if (route.length <= idx) return cb()
    route[idx++].call(ctx, evt, order, function(err, api){
        if (err) return cb(err)
        if (api) return cb(null, api)
        run(route, idx, ctx, evt, order, cb)
    })
},
proc=function(routes, idx, ctx, evt, order){
    if (routes.length <= idx) return
    run(routes[idx++], 0, ctx, evt, order, function(err, api){
        if (err) return ctx.sigslot.assert(ctx.api, evt, err)
        if (api) return ctx.sigslot.signal(api,evt,order)
        proc(routes, idx, ctx, evt, order)
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
    signal: function(api, evt, order){
        var routes = this.slots[api]
        if (!routes){
            routes=wildcard(api.split('/'), this.slots)
        }

        if (!routes) return this.assert(api, evt, 'routes['+api+'] not found')
        proc(routes, 0, {api:api,sigslot:this}, evt||{}, order||{})
    },
    assert:function(api, evt, err){
        if (0 === api.indexOf('err/')) return console.error(err)
        this.signal('err/'+api, evt, err)
    }
}

module.exports= SigSlot
