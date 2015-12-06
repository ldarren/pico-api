//
// handle (ble serial for arduino?) is not supported.
// descriptor read and write is not supported, as cordova-ble-central is not supported it yet,
// Read and write descriptors for a particular characteristic. One of the most common descriptors used is the Client Characteristic Configuration Descriptor. This allows the client to set the notifications to indicate or notify for a particular characteristic.
//
const
ERR_INVALID='invalid ble action',
ERR_OFF='ble power not on',
ERR_NO_SERVICE='no ble service'

var
util=require('util'),
bleno=require('bleno'),
args= require('../lib/args'),
Session= require('../lib/Session'),
poweredOn=false,
sigslot,
config,
device={},
dummyCB=()=>{},
Characteristic=function(name, options){
    var
    descs=options.descriptors,
    descriptors=[]

    for(var i=0,d; d=descs[i]; i++){ descriptors.push(new bleno.Descriptor(d)) }

    bleno.Characteristic.call(this, {
        uuid: options.uuid,
        properties: options.properties,
        secure: options.secure,
        descriptors: descriptors
    })

    this.name=name
},
start=function(name, spec, cb){
    cb = cb || dummyCB
    if (!spec.length) return cb()

    var
    services=[],
    characteristics=[],
    i,s,sn,chars,
    j,c

    for(i=0; s=services[i]; i++){
        sn=s.name
        chars=s.characteristics
        for(j=0; c=chars[j]; j++){
            characteristics.push(new Characteristics([name,sn,c.name].join('/'), c))
        }
        services.push(new bleno.PrimaryService(s.uuid, characteristics))
    }

    device.services=services

    bleno.startAdvertising(name, services, (err)=>{
        cb(err, ble)
    })
},
ble={
    // standard: name, services, cb
    // ibeacon: uuid, major, minor, rssi, cb
    // EIR: advertisementData(31bytes), scanData(31bytes), cb
    start:function(id){
        var err=0
        block:{
            if (!poweredOn) {err=ERR_OFF; break block}
            if (config.sealed) {err=ERR_INVALID; break block}
            switch(arguments.length){
            case 3:
                switch(typeof id){
                case 'string': return start(...arguments)
                case 'object': 
                    device.eir=[...arguments]
                    return bleno.startAdvertisingWithEIRData(...arguments)
                default: break block
                }
            case 5:
                device.beacon=[...arguments]
                return bleno.startAdvertisingIBeacon(...arguments)
            default: break block 
            }
        }
        var cb=arguments[arguments.length-1]
        cb='function'===typeof cb ? cb : dummyCB
        console.error(err+': start advertising',...arguments)
        cb(err)
    },
    stop:function(){
        bleno.stopAdvertising()
    },
    disconnect:function(){
        bleno.disconnect()
    },
    updateRSSI:function(cb){
        bleno.updateRSSI(cb)
    },
    error:function(err, character, cb, next){
        switch(err[0]){
        case 400: cb(character.RESULT_ATTR_NOT_LONG); break // attempt to write data with offset, but expected data is small
        case 404: cb(character.RESULT_INVALID_OFFSET); break // read data with offset bigger than data size
        case 415: cb(character.RESULT_INVALID_ATTRIBUTE_LENGTH); break // write data size not right
        default: cb(character.RESULT_UNLIKELY_ERROR); break
        }
        next()
    },
    render:function(buffer, offset, character, cb, next){
        if (offset) buffer=buffer.slice(offset)
        if (cb) cb(character.RESULT_SUCCESS, buffer) // for write request, buffer will be ignore
        if (character.updateValueCB) character.updateValueCB(buffer)
        next()
    }
}

Characteristic.prototype={
    // read request handler, function(offset, callback) { ... }
    onReadRequest:function(offset, cb){
        console.log(this.name+'/read: ' + offset)
        sigslot.signal(this.name+'/read', Session.TYPE.BLE, null, offset, this, cb)
    },
    // write request handler, function(data, offset, withoutResponse, callback) { ...}
    onWriteRequest:function(data, offset, withoutResponse, cb){
        console.log(this.name+'/write: ' + data.toString('hex') + ' ' + offset + ' ' + withoutResponse)
        sigslot.signal(this.name+'/write', Session.TYPE.BLE, data, offset, this, cb)
    },
    // notify/indicate subscribe handler, function(maxValueSize, updateValueCallback) { ...}
    onSubscribe:function(maxValueSize, updateValueCB){
        console.log(this.name+'/subscribe: ' + maxValueSize)
        bleno.Characteristic.prototype.onSubscribe.call(this, maxValueSize, updateValueCB)
        sigslot.signal(this.name+'/subscribe', Session.TYPE.BLE, null, 0, this)
    },
    // notify/indicate unsubscribe handler, function() { ...}
    onUnsubscribe:function(){
        console.log(this.name+'/unsubscribe: ' + arguments)
        bleno.Characteristic.prototype.onUnsubscribe.call(this)
        sigslot.signal(this.name+'/unsubscribe', Session.TYPE.BLE, null, 0, this)
    },
    // notify sent handler, function() { ...}
    onNotify:function(){
        console.log(this.name+'/notify: ' + arguments)
        sigslot.signal(this.name+'/notify', Session.TYPE.BLE, null, 0, this)
    },
    // indicate confirmation received handler, function() { ...}
    onIndicate:function(){
        console.log(this.name+'/indicate: ' + arguments)
        sigslot.signal(this.name+'/indicate', Session.TYPE.BLE, null, 0, this)
    }
}

util.inherits(Characteristic, bleno.Characteristic)

module.exports= {
    create: function(appConfig, libConfig, next){
        config={
            name:'pico',
            services:[],
            sealed:true
        }

        args.print('BLE Options',Object.assign(config,libConfig))

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
