var
args= require('./lib/args'),
mods= require('./lib/mods'),
defaults= {
    config: ['./config/config.json', 'app config path'],
    help: [false, 'show this help'],
    c: '@config',
    h: '@help'
},
options = args.parse(defaults)

if (!options || options.help){
    args.usage(defaults)
    process.exit(0)
}

mods.load(__dirname, options.config, function(err, context){
    if (err) return console.error(err)
})
