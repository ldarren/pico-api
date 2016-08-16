var
Session=require('./Session'),
picoTime=require('pico-common').export('pico/time'),
picoStr=require('pico-common').export('pico/str'),
dummyCB=()=>{},
SigSlot=function(){
    this.slots= {}
	this.builtRoutes=[]
	this.name=Math.ceil(Math.random()*100000)
},
wildcard=function(path, slots){
    if (!path.length) return
    path.pop()
    return slots[path.join('/')] || wildcard(path, slots)
},
run=function(route, idx, ctx, cb){
    if (route.length <= idx) return cb()
    var
    funcs=route[idx++],
    func=funcs[0],
    args=[],
    f

    // callback to request module
    if (!func){
        funcs=ctx.getKeys(ctx.type).reverse()
        f=funcs[0]
        if (!ctx.has(f)) return run(route, idx, ctx, cb)
        func=ctx.get(f)
		if (!(func instanceof Function)) return run(route, idx, ctx, cb)
    }

    for(var i=1; f=funcs[i]; i++){
        if (Array.isArray(f)) args.push(...f)
        else {
            switch(f[0]){
            default: args.push(ctx.get(f)); break
            case ':':args.push(ctx.getArray(f)); break
            case '$':args.push(ctx.getString(f)); break
            case '%':args.push(ctx.getNumber(f)); break
            case '&':args.push(ctx.getSet(f)); break
            case '*':args.push(ctx.getWeakSet(f)); break
            case '@':args.push(ctx.getMap(f)); break
            case '#':args.push(ctx.WeakMap(f)); break
            }
        }
    }

    args.push((err, api)=>{
        if (err || api) return cb(err, api)
        run(route, idx, ctx, cb)
    })

    func.apply(ctx, args)
},
proc=function(routes, idx, ctx){
    if (routes.length <= idx) return
    run(routes[idx++], 0, ctx, (err, api)=>{
        if (err) return ctx.sigslot.assert(ctx.api, ctx, err)
        if (api) return ctx.sigslot.signalWithSession.call(ctx.sigslot, api, ctx)
        proc(routes, idx, ctx)
    })
},
load=function(self, keys, deps, routes, cb){
    if(!keys.length) return cb()
    var
    k=keys.shift(),
    route=routes[k]

    for(var i=0,f; f=route[i]; i++){
        switch(f.length){
        case 0: break
        case 1: route[i]=[]; break
        default: f.splice(0, 2, deps[f[0]][f[1]]); break
        }
    }

    self.slot(k, route)
    load(self, keys, deps, routes, cb)
}

SigSlot.prototype= {
    load: function(deps, routes, cb){
        load(this, Object.keys(routes), deps, routes, cb||dummyCB)
    },
    slot: function(api, funcs){
        var
        slots=this.slots,
        routes=slots[api]=slots[api]||[]

		picoStr.compileRest(api,this.builtRoutes)
        routes.push(funcs)
    },
    unslot: function(api){
        delete this.slots[api]
    },
    signal: function(api, type){
        var
		routes = this.slots[api],// || wildcard(api.split('/'), this.slots),
		params

        if (!routes){
			params={}
			routes=this.slots[picoStr.execRest(api, this.builtRoutes, params)]
			if(!routes)return console.error(`slot[${api}] not found`)
		}
        proc(routes, 0, Session.alloc(
			api,
			this,
			type||Session.TYPE.CUSTOM,
			params,
			Array.prototype.slice.call(arguments, arguments.callee.length)))
    },
    signalWithSession: function(api, sess){
        var routes = this.slots[api]

        if (!routes){
			routes=this.slots[picoStr.execRest(api, this.builtRoutes, sess.params || {})]
			if (!routes) return this.assert(api, sess, `slot[${api}] not found, session[${sess.api}]`)
		}
        proc(routes, 0, sess)
    },
    // at is cron format. at format: min, hour, dom, mon, dow, yr
    signalAt: function(at){
        var
        now=Date.now(),
        ast=Array.isArray(at) ? at : picoTime.parse(at),
        then=picoTime.nearest.apply(picoTime, ast)
        if (now > then) return

        var params=Array.prototype.slice.call(arguments, arguments.callee.length)

        setTimeout(()=>{
            this.signalAt(ast, ...params)
            this.signal(...params)
        }, then-now)
    },
    assert:function(api, sess, err){
        if (0 === api.indexOf('ERR/')) return console.error(err)
        sess.set('error', err)
        this.signalWithSession('ERR/'+(api||''), sess)
    },
    abort:function(api){
        return 'END/'+(api||'')
    }
}

module.exports= SigSlot
