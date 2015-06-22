var
path = require('path'),
extend = require('pico-common').obj.extend,
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
loadAPI = function(apis, context, cb){
    if (!apis.length) { return cb() }
    var api = apis.shift()

    api.setup(context, function(err){
        if (err) console.error('failed to load api', err)
        loadAPI(apis, context, cb)
    }) 
},
loadAPIs = function(apiPaths, context, cb){
    if (!apiPaths || !apiPaths.length) { return cb(null, context) }
    var
    apiPath = apiPaths.shift(),
    apis
    
    try{
        apis = require(context.config.app.path+path.sep+apiPath)
    }catch(ex){
        console.error('failed to load apis', apiPath, ', exception:',ex.message)
        return loadAPIs(apiPaths, context, cb)
    }

    loadAPI(apis, context, function(){
        return loadAPIs(apiPaths, context, cb)
    })
},
loadConfig = function(rootPath, configPath, cb){
    var config = require(configPath)
    if (!config || !config.app) return cb('Error: incomplete config, config file must contain an app section')

    if (config.app.path) console.warn('Warn: app.path[',config.app.path,'] is replaced by', rootPath)
    config.app.path = rootPath

    if (config.deps){
        var
        r = config.deps,
        p = path.dirname(configPath) + path.sep,
        opt = {mergeArr: true}
        for(var i=0,l=r.length; i<l; i++){
            config = extend(require(p+r[i]), config, opt) 
        }
    }

    loadMods(config.mods ? Object.keys(config.mods) : undefined, {config: config}, function(err, context){
        if (err) return cb(err)
        loadAPIs(config.app.apis, context, function(err){
            return cb(err, config)
        })
    })
}

module.exports = {
    load: function(rootPath, configPath){
        console.log('load modules',rootPath,configPath)

        loadConfig(rootPath, rootPath + path.sep + configPath, function(err, config){
            if (err) return console.error(err)
        })
    }
}
