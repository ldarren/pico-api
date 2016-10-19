let
path= require('path'),
pico= require('pico-common'),
mods= require('./mods'),
utils= require('./utils'),
cfg=require('../lib/cfg')

mods.load(cfg.parse(path.resolve(__dirname,'..')), (err, context, appCfg)=>{
    if (err) return console.error(err)

    appCfg.ajax=utils.ajax
    appCfg.env={ env:appCfg.env,context:context }

    pico.run(appCfg,()=>{
        let
        apis=require('api/index.json'),
        models=require('model/index')

        return function(){
            let
            ctx=pico.env('context'),
            load=function(keys,deps,cb){
                if (!keys.length) return cb()
                let
                k=keys.shift(),
                v=deps[k]
                if (Array.isArray(v)){
                    deps[k]=ctx[v[1]]
                    return load(keys,deps,cb)
                }
                require(v, (err, mod)=>{
                    if (err) return cb(err)
                    mod.setup(ctx, (err)=>{
                        if (err) return cb(err)
                        deps[k]=mod
                        load(keys,deps,cb)
                    })
                })
            },
            // nodejs counterpart is in lib/mods
            setup=function(list,cb){
                if (!list.length) return cb()
				var model=list.shift()
                model.setup(ctx,(err)=>{
                    if (err) return cb(err)
                    setup(list,cb)
                })
            },
			error=function(err){
				console.error(err)
			},
			timerId=setTimeout(error,5000,`failed to load ${ctx.config.app.name} api`)

            load(Object.keys(apis.deps), apis.deps, (err)=>{
                if (err) return error(err)
				clearTimeout(timerId)
				timerId=setTimeout(error,5000,`failed to load ${ctx.config.app.name} model`)
                setup(Object.getPrototypeOf(models), (err)=>{
                    if (err) return error(err)
					clearTimeout(timerId)
                    ctx.sigslot.load(apis.deps, apis.routes)
                })
            })
        }
    })
})
