const
ERR_INVALID='invalid ble action'

var
noble=require('noble'),
args= require('../lib/args'),
Session= require('../lib/Session'),
poweredOn=false,
sigslot,
config,
device={},
dummyCB=()=>{},
bleMgr={
    start:function(){
    },
    stop:function(){
    }
}

module.exports= {
    create: function(appConfig, libConfig, next){
        config={
            name:'pico',
            services:[],
            sealed:true
        }

        args.print('BLE_MGR Options',Object.assign(config,libConfig))

        if (!config.services.length) return next(ERR_NO_SERVICE)

        sigslot= appConfig.sigslot

        bleno.on('stateChange',(state)=>{
            console.log(`BLE state ${state} at ${Date.now()}`)
            switch(state){
            case 'poweredOn':
                poweredOn=on
                start(config.name, config.services, next)
                break
            case 'unknown':
            case 'unsupported':
            case 'unauthorized':
            case 'resetting':
            case 'poweredOff':
                poweredOn=false
                bleno.stopAdvertising()
                break
            }
        })
        bleno.on('advertisingStart', (err)=>{
            if (!err) sigslot.signal('ble/start', Session.TYPE.BLE)
        })
        bleno.on('advertisingStartError', (err)=>{
            sigslot.signal('ERR/ble/start', Session.TYPE.BLE, err)
        })
        bleno.on('advertisingStop', ()=>{
            sigslot.signal('ble/stop', Session.TYPE.BLE)
        })
        bleno.on('servicesSet', (err)=>{
            if (!err) sigslot.signal('ble/service/set', Session.TYPE.BLE)
        })
        bleno.on('servicesSetError', (err)=>{
            sigslot.signal('ERR/ble/service/set', Session.TYPE.BLE, err)
        })
        // following are linux only
        bleno.on('accept', (address)=>{
            sigslot.signal('ble/connect', Session.TYPE.BLE, address)
        })
        bleno.on('disconnect', (address)=>{
            sigslot.signal('ble/disconnect', Session.TYPE.BLE, address)
        })
        bleno.on('rssiUpdate', (rssi)=>{
            sigslot.signal('ble/rssi/update', Session.TYPE.BLE, rssi)
        })
    }
}
