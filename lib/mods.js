var
path = require('path'),
loadMods = function(keys, context, cb){
    if (!keys || !keys.length) { return cb(null, context) }

    var
    config = context.config, app = config.app, mods = config.mods,
    key = keys.shift(),
    value = mods[key],
    mod=value.mod

    if (!mod) return loadMods(keys, context, cb) //ignore empty mod

    var module = require('.' === mod.charAt(0) ? mod : path.resolve(app.path, 'mod', mod))

    module.create(app, value, function(err, mod){
        if (err) console.error('failed to load modules', value.mod, err)
        context[key] = mod
        loadMods(keys, context, cb)
    })
},
loadDeps = function(keys, deps, context, cb){
    if (!keys.length) return cb()

    var
    k=keys.shift(),
    v=deps[k]

    if (Array.isArray(v)){
        deps[k]=context[v[1]]
        return loadDeps(keys, deps, context, cb)
    }

    var m=require(path.resolve(context.config.app.path, v))
    deps[k]=m
    m.setup(context, function(err){
        if (err) return cb(err)
        loadDeps(keys, deps, context, cb)
    })
},
// pico counterpart of loadAction is in lib/app.js
loadAction = function(action, context, cb){
    loadDeps(Object.keys(action.deps), action.deps, context, function(err){
        if (err) return cb(err)
        context.sigslot.load(action.deps, action.routes, cb)
    })
},
loadActions = function(actionPaths, context, cb){
    if (!actionPaths || !actionPaths.length) { return cb(null, context) }
    var
    actionPath = actionPaths.shift(),
    dir=context.config.app.path,
    p=path.resolve(dir,actionPath),
    action
    
    try{
        action = require(p)
    }catch(ex){
        console.error('failed to load actions %s, exception: %s',actionPath,ex.message)
        return loadActions(actionPaths, context, cb)
    }

    context.config.app.path=path.dirname(p)
    loadAction(action, context, function(){
        context.config.app.path=dir
        return loadActions(actionPaths, context, cb)
    })
}

module.exports = {
    load: function(config, cb){
		var app=config.app
        console.log('load modules',app.name,app.id)

		loadMods(config.mods ? Object.keys(config.mods) : undefined, {config: config, sigslot:app.sigslot}, function(err, context){
			if (err) return cb(err)
			if (!app.actions) return cb(null, context, app)
			loadActions(app.actions, context, function(err){
				return cb(err, context, app)
			})
		})
    }
}
