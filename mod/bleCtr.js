const
ERR_INVALID='invalid ble action'

var
noble=require('noble'),
args= require('../lib/args'),
Session= require('../lib/Session'),
poweredOn=false,
sigslot,
serviceMap={},
characteristicMap={},
characteristicList=[],
dummyCB=()=>{},
getChar=function(sUUID, cUUID, index, cb){
    for(var i=index,c; c=characteristicList[i]; i++){
        if (c._serviceUuid===sUUID && c.uuid===cUUID) break
    }
    cb(null, c, ()=>{
        getChar(sUUID, cUUID, i, cb)
    })
},
getChars=function(service, characteristic, cb){
    var
    sUUID=serviceMap[service],
    cUUID=characteristicMap[characteristic]

    if (!sUUID) return cb(`invalid service: ${service}`)
    if (!cUUID) return cb(`invalid characteristic: ${characteristic}`)

    getChar(sUUID, cUUID, 0, cb)
},
start=function(services, characteristics, allowDuplicates, cb){
    serviceMap = services||serviceMap
    characteristicMap=characteristics||characteristicMap

    characteristicList=[]

    var
    keys=Object.keys(serviceMap),
    uuids=[]
    for(var i=0,id; id=services[keys[i]]; i++){
        uuids.push(id)
    }

    noble.startScanning(uuids, allowDuplicates, cb)
},
bleCtr={
    start:function(){
        start(...arguments)
    },
    stop:function(){
        noble.stopScanning()
    },
    read:function(service, characteristic, cb){
        var results=[]
        getChar(service, characteristic, (err, c, next)=>{
            if (!c) return cb(err, results)
            c.read((err,data)=>{
                if (err) return cb(err)
                results.push(data)
                next()
            })
        })
    },
    write:function(service, characteristic, data, withoutResponse, notify, cb){
        var results=[]
        getChar(service, characteristic, (err, c, next)=>{
            if (!c) return cb(err, results)
            if (notify){
                c.on('data', (ret, isNotification)=>{
                    results.push(ret)
                    next()
                })
            }
            if (withoutResponse){
                c.write(data, withoutResponse)
                if (!notify) return next()
            }
            c.write(data, withoutResponse, (err)=>{
                if (err) return cb(err)
                next()
            })
        })
    }
}

module.exports= {
    create: function(appConfig, libConfig, next){
        config={
            services:{},
            characteristics:{}
        }

        args.print('BLE_CTR Options',Object.assign(config,libConfig))

        sigslot= appConfig.sigslot

        noble.on('stateChange',(state)=>{
            console.log(`BLE_CTR state ${state} at ${Date.now()}`)
            switch(state){
            case 'poweredOn':
                poweredOn=on
                start(config.services, config.characteristics, false, next)
                break
            case 'unknown':
            case 'unsupported':
            case 'unauthorized':
            case 'resetting':
            case 'poweredOff':
                poweredOn=false
                noble.stopScanning()
                break
            }
        })
        noble.on('discover', (peripheral)=>{
            peripheral.discoverAllServicesAndCharacteristics((err, services, characteristics)=>{
                characteristicList.push(...characteristics)
                sigslot.signal('bleCtr/discover', Session.TYPE.BLE_CTR)
            })
        })
        noble.on('scanStart', ()=>{
            sigslot.signal('bleCtr/start', Session.TYPE.BLE_CTR)
        })
        noble.on('scanStop', ()=>{
            sigslot.signal('bleCtr/stop', Session.TYPE.BLE_CTR)
        })
        noble.on('warning', (msg)=>{
            sigslot.signal('ERR/bleCtr', Session.TYPE.BLE_CTR, msg)
        })

    }
}
