// TODO: must contained pubsub communication channel, reuse pipeline feature?
var
redis = require('redis'),
picoObj= require('pico').export('pico/obj'),
args= require('../lib/args')

module.exports={
    create:function(appConfig, libConfig, next){
        var config={
            host:'localhost',
            port:6379,
            database:0,
            password:'null',
            options:null,
        }

        args.print('Redis Options',picoObj.extend(config,libConfig))

        var client = redis.createClient(config.port, config.host, config.options)
        if (config.password) client.auth(config.password)
        client.select(config.database)

        // node_redis handles reconnection only if error event is listened
        client.on('error', function(err){
            console.error('redis conn[%s:%d.%d] error:%s',config.host,config.port,config.database,err)
        })
        client.on('end', function(){
            console.log('redis conn[%s:%d.%d] end',config.host,config.port,config.database)
        })
        client.on('reconnecting', function(){
            console.log('redis conn[%s:%d.%d] reconnecting...',config.host,config.port,config.database)
        })
        client.on('connect', function(){
            console.log('redis conn[%s:%d.%d] connected',config.host,config.port,config.database)
        })
        return next(null, client)
    }
}
