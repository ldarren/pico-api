var
path = require('path'),
picoObj= require('pico').export('pico/obj'),
SigSlot= require('./SigSlot'),
loadMods = function(keys, context, cb){
    if (!keys || !keys.length) { return cb(null, context) }

    var
    config = context.config, app = config.app, mods = config.mods,
    key = keys.shift(),
    value = mods[key],
    module = require('.' === value.mod.charAt(0) ? value.mod : path.resolve(app.path, 'mod', value.mod))
    module.create(app, value, function(err, mod){
        if (err) console.error('failed to load modules', value.mod, err)
        context[key] = mod
        loadMods(keys, context, cb)
    })
},
loadAction = function(actions, context, cb){
    if (!actions.length) { return cb() }
    var action = actions.shift()

    action.setup(context, function(err){
        if (err) console.error('failed to load action', err)
        loadAction(actions, context, cb)
    }) 
},
loadActions = function(actionPaths, context, cb){
    if (!actionPaths || !actionPaths.length) { return cb(null, context) }
    var
    actionPath = actionPaths.shift(),
    actions
    
    try{
        actions = require(path.resolve(context.config.app.path,actionPath))
    }catch(ex){
        console.error('failed to load actions %s, exception: %s',actionPath,ex.message)
        return loadActions(actionPaths, context, cb)
    }

    loadAction(actions, context, function(){
        return loadActions(actionPaths, context, cb)
    })
},
loadConfig = function(rootPath, configPath, cb){
    var config = require(configPath)
    if (!config || !config.app) return cb('Error: incomplete config, config file must contain an app section')

    if (config.deps){
        var
        r = config.deps,
        p = path.dirname(configPath),
        opt = {mergeArr: true}
        for(var i=0,d; d=r[i]; i++){
            config = picoObj.extend(require(path.resolve(p,d)), config, opt) 
        }
    }

    var app=config.app
    if (app.path) console.warn('Warn: app.path[%s] is replaced by %s', app.path,rootPath)
    app.path= rootPath
    app.sigslot= new SigSlot()

    loadMods(config.mods ? Object.keys(config.mods) : undefined, {config: config, sigslot:app.sigslot}, function(err, context){
        if (err) return cb(err)
        if (!app.actions) return cb(null, context, app)
        loadActions(app.actions, context, function(err){
            return cb(err, context, app)
        })
    })
}

module.exports = {
    load: function(rootPath, configPath, cb){
        console.log('load modules',rootPath,configPath)

        loadConfig(rootPath, path.resolve(rootPath,configPath), cb)
    }
}
