const
SESSION_TYPE='custom',
Session=require('picos-session'),
pTime=require('pico-common').export('pico/time'),
pStr=require('pico-common').export('pico/str'),
dummyCB=()=>{},
SigSlot=function(runTTL){
    this.slots= {}
	this.builtRoutes=[]
	this.runTTL = runTTL || 5000
	console.log(runTTL)
	this.name=Math.ceil(Math.random()*100000)
},
wildcard=function(path, slots){
    if (!path.length) return
    path.pop()
    return slots[path.join('/')] || wildcard(path, slots)
},
runExpired=function(ctx,idx){
	console.warn(`Signal.run stucked @ ${ctx.api}:${idx-1}`)
},
run=function(route, idx, ctx, cb){
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
            case '$':args.push(ctx.getReadonly(f)); break
            case ':':args.push(ctx.getArray(f)); break
            case '@':args.push(ctx.getMap(f)); break
            case '#':args.push(ctx.WeakMap(f)); break
            case '%':args.push(ctx.getSet(f)); break
            case '^':args.push(ctx.getWeakSet(f)); break
            }
        }
    }

	const expiry=setTimeout(runExpired,ctx.sigslot.runTTL,ctx,idx)

    args.push((err, api)=>{
		clearTimeout(expiry)
        if (err || api) return cb(err, api)
        run(route, idx, ctx, cb)
    })

    func.apply(ctx, args)
},
proc=function(routes, idx, ctx){
    if (routes.length <= idx) return
    run(routes[idx++], 0, ctx, (err, api)=>{
        if (err) ctx.sigslot.assert(ctx.api, ctx, err)
        else if (api) ctx.sigslot.signalWithSession.call(ctx.sigslot, api, ctx)
		/* fall through */
        proc(routes, idx, ctx)
    })
},
load=function(self, keys, deps, routes, cb){
    if(!keys.length) return cb()
    const
    k=keys.shift(),
    route=routes[k],
	at=pTime.parse(k)

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

	if (at) self.signalAt(at,k)

    self.slot(k, route)
    load(self, keys, deps, routes, cb)
}

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
    signal(api, type, ...args){
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
			type||SESSION_TYPE,
			params,
			args))
    },
    signalWithSession(api, sess){
        let routes = this.slots[api]

        if (!routes){
			routes=this.slots[pStr.execRest(api, this.builtRoutes, sess.params || {})]
			if (!routes) return this.assert(api, sess, `slot[${api}] not found, session[${sess.api}]`)
		}
		sess.api=api
        proc(routes, 0, sess)
    },
    // at is cron format. at format: min, hour, dom, mon, dow, yr
    signalAt(at, ...args){
        const
        now=Date.now(),
        ast=Array.isArray(at) ? at : pTime.parse(at),
        then=pTime.nearest(...ast)
        if (now > then) return

        setTimeout((params)=>{
            this.signalAt(ast, ...params)
            this.signal(...params)
        }, then-now, args)
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

Session.addType(SESSION_TYPE, [])

module.exports= SigSlot
