var
args= require('./lib/args'),
mods= require('./lib/mods'),
defaults= {
    worker: ['./worker.js', 'worker script path'],
    config: ['./config/config.json', 'app config file path'],
    help: [false, 'show this help'],
    h: [false, 'show this help']
},
options = args.parse(defaults)

if (!options || options.help || options.h){
    args.usage(defaults)
    process.exit(0)
}

mods.load(__dirname, options.config, function(err, context){
    if (err) return console.error(err)
})
