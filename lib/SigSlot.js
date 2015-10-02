var
dummyCB=function(){},
SigSlot=function(){
    this.slots= {}
},
wildCard=function(path, slots){
    if (!path.length) return null
    path[path.length-1]='*'
    var route=slots[path.join('/')]
    if (route)return route
    path.pop()
    return wildCard(path, slots)
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
        if (err) return ctx.sigslot.signal('err/'+ctx.api,evt,err)
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
        cb=cb || dummyCB
        var routes = this.slots[api]
        
        if (!routes){
            routes=wildCard(api.split('/'), this.slots)
        }

        if (!routes) return cb('routes[%s] not found',api)
        proc(routes, 0, {api:api,sigslot:this}, evt||{}, order||{})
    }
}

module.exports= SigSlot
