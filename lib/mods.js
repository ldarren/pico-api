const
path = require('path'),
loadMods = function(keys, context, cb){
    if (!keys || !keys.length) { return cb(null, context) }

    const
    config = context.config, app = config.app, mods = config.mods,
    key = keys.shift(),
    value = mods[key],
    mod=value.mod

    if (!mod) return loadMods(keys, context, cb) //ignore empty mod

    let module
	try { module = require(path.resolve(app.path, 'mod', mod)) }
	catch(e) { module = require(mod) }

    module.create(app, value, (err, m)=>{
        if (err) console.error('failed to load modules', mod, err)
        context[key] = m
        loadMods(keys, context, cb)
    })
},
loadDeps = function(cwd, keys, deps, context, cb){
    if (!keys.length) return cb()

    const
    k=keys.shift(),
    v=deps[k]

    if (Array.isArray(v)){
        deps[k]=context[v[1]]
        return loadDeps(cwd, keys, deps, context, cb)
    }
    const m=require(path.resolve(cwd, v))
    deps[k]=m
    m.setup(context, (err)=>{
        if (err) return cb(err)
        loadDeps(cwd, keys, deps, context, cb)
    })
},
// pico counterpart of loadAction is in lib/app.js
loadAction = function(cwd, action, context, cb){
    loadDeps(cwd, Object.keys(action.deps), action.deps, context, (err)=>{
        if (err) return cb(err)
        context.sigslot.load(action.deps, action.routes, cb)
    })
},
loadActions = function(cwd, actionPaths, context, cb){
    if (!actionPaths || !actionPaths.length) { return cb(null, context) }

    const
    actionPath = actionPaths.shift(),
    p=path.resolve(cwd,actionPath)

	let action
    
    try{
        action = require(p)
    }catch(ex){
        console.error('failed to load actions %s, exception: %s',actionPath,ex.message)
        return loadActions(cwd, actionPaths, context, cb)
    }

    loadAction(path.dirname(p), action, context, ()=>{
        return loadActions(cwd, actionPaths, context, cb)
    })
}

module.exports = {
    load(config, cb){
		const app=config.app
        console.log('load modules',app.name,app.id)

		loadMods(config.mods ? Object.keys(config.mods) : undefined, {config: config, sigslot:app.sigslot}, (err, context)=>{
			if (err) return cb(err)
			if (!app.actions) return cb(null, context, app)
			loadActions(process.cwd(),app.actions, context, (err)=>{
				return cb(err, context, app)
			})
		})
    }
}
