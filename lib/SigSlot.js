var
dummyCB=function(){},
SigSlot=function(){
    this.slots= {}
},
proc=function(route, idx, evt, order, cb){
    if (route.length <= idx) return cb()
    route[idx++].call(null, evt, order, function(err){
        if (err) return cb(err)
        proc(route, idx, evt, order, cb)
    })
}

SigSlot.prototype= {
    slot: function(api, funcs){
        if (this.slots[api]) return console.error('route[%s] is already taken',api)
        this.slots[api]= funcs
    },
    signal: function(api, evt, cb){
        cb=cb || dummyCB
        var route = this.slots[api]

        if (!route) return cb('route[%s] not found',api)
        proc(route, 0, evt||{}, {}, cb)
    }
}

module.exports= SigSlot
