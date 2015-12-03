var
util=require('util'),
bleno=require('bleno'),
args= require('../lib/args'),
Session= require('../lib/Session'),
sigslot,
dummyCB=function(){},
ble={
}

module.exports= {
    create: function(appConfig, libConfig, next){
        var
        config={
            name:'pico',
            uuids:[]
        }

        args.print('BLE Options',Object.assign(config,libConfig))

        if (!config.uuids.length) return

        sigslot= appConfig.sigslot

        server= bleno.on('stateChange',state=>{
            console.log(`BLE state ${state} at ${Date.now()}`)
            switch(state){
            case 'poweredOn':
                bleno.startAdvertising(config.name, config.uuids, error=>{
                    next(err, ble)
                })
                break
            case 'unknown':
            case 'unsupported':
            case 'unauthorized':
            case 'resetting':
            case 'poweredOff':
                bleno.stopAdvertising()
                break
            }
        })
    }
}
