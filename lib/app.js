var
path= require('path'),
pico= require('pico'),
args= require('./args'),
mods= require('./mods'),
utils= require('./utils'),
defaults= {
    config: ['./config/profile/urs.pro.json', 'app config path'],
    c: '@config',
    help: [false, 'show this help'],
    h: '@help'
},
options = args.parse(defaults)

if (!options || options.help){
    args.usage(defaults)
    process.exit(0)
}

mods.load(path.resolve(__dirname,'..'), options.config, function(err, context, appCfg){
    if (err) return console.error(err)

    appCfg.ajax=utils.ajax
    appCfg.env={ context:context }

    pico.run(appCfg,function(){
        var
        apis=require('api/index'),
        models=require('model/index'),
        setup=function(list,ctx,cb){
            if (!list.length) return cb()
            list.unshift().setup(ctx,function(err){
                if (err) return cb(err)
                setup(list,ctx,cb)
            })
        }

        this.load=function(){
            var ctx=pico.env('context')

            setup(models, ctx, function(err){
                if (err) return console.error(err)
                setup(apis, ctx, function(){})
            })
        }
    })
})
