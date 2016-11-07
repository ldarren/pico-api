const
Session=require('./Session'),
pTime=require('pico-common').export('pico/time'),
pStr=require('pico-common').export('pico/str'),
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
runExpired=function(ctx){
	console.warn(`Signal.run stucked at ${ctx.api}`)
},
run=function(route, idx, ctx, cb){
	clearTimeout(runExpireId)
    if (route.length <= idx) return cb()
    const args=[]
	let
    funcs=route[idx++],
    func=funcs[0],
    f

    // callback to request module
    if (!func){
        funcs=ctx.getKeys(ctx.type).reverse()
        f=funcs[0]
        if (!ctx.has(f)) return run(route, idx, ctx, cb)
        func=ctx.get(f)
		if (!(func instanceof Function)) return run(route, idx, ctx, cb)
    }

    for(let i=1; f=funcs[i]; i++){
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

	runExpireId=setTimeout(runExpired,1000,ctx)
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
    const
    k=keys.shift(),
    route=routes[k]

    for(let i=0,f; f=route[i]; i++){
        switch(f.length){
        case 0: break
        case 1: f.length=0; break
        default:
			f.splice(0, 2, deps[f[0]][f[1]]);
			if (!f[0]) throw `invalid route[${k}] at rule[${i}]`
			break
        }
    }

    self.slot(k, route)
    load(self, keys, deps, routes, cb)
}

let runExpireId=0

SigSlot.prototype= {
    load(deps, routes, cb){
        load(this, Object.keys(routes), deps, routes, cb||dummyCB)
    },
    slot(api, funcs){
        const
        slots=this.slots,
        routes=slots[api]=slots[api]||[]

		pStr.compileRest(api,this.builtRoutes)
        routes.push(funcs)
    },
    unslot(api){
        delete this.slots[api]
    },
    signal(api, type){
        let
		routes = this.slots[api],// || wildcard(api.split('/'), this.slots),
		params

        if (!routes){
			params={}
			routes=this.slots[pStr.execRest(api, this.builtRoutes, params)]
			if(!routes)return console.error(`slot[${api}] not found`)
		}
        proc(routes, 0, Session.alloc(
			api,
			this,
			type||Session.TYPE.CUSTOM,
			params,
			Array.prototype.slice.call(arguments, arguments.callee.length)))
    },
    signalWithSession(api, sess){
        let routes = this.slots[api]

        if (!routes){
			routes=this.slots[pStr.execRest(api, this.builtRoutes, sess.params || {})]
			if (!routes) return this.assert(api, sess, `slot[${api}] not found, session[${sess.api}]`)
		}
        proc(routes, 0, sess)
    },
    // at is cron format. at format: min, hour, dom, mon, dow, yr
    signalAt(at){
        const
        now=Date.now(),
        ast=Array.isArray(at) ? at : pTime.parse(at),
        then=pTime.nearest.apply(pTime, ast)
        if (now > then) return

        const params=Array.prototype.slice.call(arguments, arguments.callee.length)

        setTimeout(()=>{
            this.signalAt(ast, ...params)
            this.signal(...params)
        }, then-now)
    },
    assert(api, sess, err){
        if (0 === api.indexOf('ERR/')) return console.error(err)
        sess.set('error', err)
        this.signalWithSession('ERR/'+(api||''), sess)
    },
    abort(api){
        return 'END/'+(api||'')
    }
}

module.exports= SigSlot
