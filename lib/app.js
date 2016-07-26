var
path= require('path'),
pico= require('pico'),
args= require('pico-args'),
mods= require('./mods'),
utils= require('./utils'),
defaults= {
    config: ['./config/profile/app.pro.json', 'app config path'],
    c: '@config',
    help: [false, 'show this help'],
    h: '@help'
},
options = args.parse(defaults)

if (!options || options.help){
    args.usage(defaults)
    process.exit(0)
}

mods.load(path.resolve(__dirname,'..'), options.config, (err, context, appCfg)=>{
    if (err) return console.error(err)

    appCfg.ajax=utils.ajax
    appCfg.env={ context:context }

    pico.run(appCfg,()=>{
        var
        apis=require('api/index.json'),
        models=require('model/index')

        return function(){
            var
            ctx=pico.env('context'),
            load=function(keys,deps,cb){
                if (!keys.length) return cb()
                var
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
                list.shift().setup(ctx,(err)=>{
                    if (err) return cb(err)
                    setup(list,cb)
                })
            }

            load(Object.keys(apis.deps), apis.deps, (err)=>{
                if (err) return console.error(err)
                setup(Object.getPrototypeOf(models), (err)=>{
                    if (err) return console.error(err)
                    ctx.sigslot.load(apis.deps, apis.routes)
                })
            })
        }
    })
})
