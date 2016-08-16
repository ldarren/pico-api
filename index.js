var
args= require('pico-args'),
mods= require('./lib/mods'),
defaults= {
    config: ['./config/pico.pro.json', 'app config path'],
    c: '@config',
    help: [false, 'show this help'],
    h: '@help'
},
options = args.parse(defaults)

if (!options || options.help){
    args.usage(defaults)
    process.exit(0)
}
console.log(options.config)
mods.load(__dirname, options.config, (err, context)=>{
    if (err) return console.error(err)
})
