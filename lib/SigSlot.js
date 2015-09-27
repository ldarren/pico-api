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
    if (route.length <= idx) return cb(null)
    route[idx++].call(ctx, evt, order, function(err){
        if (err) return cb(err)
        run(route, idx, ctx, evt, order, cb)
    })
},
proc=function(routes, idx, ctx, evt, order, cb){
    if (routes.length <= idx) return cb(null, evt, order)
    run(routes[idx++], 0, ctx, evt, order, function(err){
        if (err) return cb(err, evt, order)
        proc(routes, idx, ctx, evt, order, cb)
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
    signal: function(api, evt, cb){
        cb=cb || dummyCB
        var routes = this.slots[api]
        
        if (!routes){
            routes=wildCard(api.split('/'), this.slots)
        }

        if (!routes) return cb('routes[%s] not found',api)
        proc(routes, 0, {api:api}, evt||{}, {}, cb)
    }
}

module.exports= SigSlot
