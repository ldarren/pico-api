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

    pico.run({
        production:true,
        ajax:utils.ajax,
        paths:{
            '*': 'http://107.20.154.29/urs/mod/',
            api: 'http://107.20.154.29/urs/api/',
        },
        env:{
            context:context,
            appCfg:appCfg
        }
    },function(){
        var urs=require('api/index')
        this.load=function(){
            urs.setup(pico.env('context'), pico.env('appCfg'), function(){})
        }
    })
})
