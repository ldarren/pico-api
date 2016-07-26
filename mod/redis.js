// TODO: must contained pubsub communication channel, reuse pipeline feature?
var
redis = require('redis'),
args= require('pico-args'),
Session= require('../lib/Session'),
send=(sigslot,pattern,channel,msg)=>{
	var input
	try{input=JSON.parse(msg)}
	catch(exp){input,msg}
    sigslot.signal(pattern, Session.TYPE.REDIS,input,channel)
},
listenTo=(evt,client,channels,cb)=>{
	if (!channels || !channels.length) return
	client.on(evt,cb)
	client.subscribe.apply(client, channels)
}

module.exports={
    create:function(appConfig, libConfig, next){
        var config={
            host:'localhost',
            port:6379,
            database:0,
            password:null,
            options:null
        }

        args.print('Redis Options',Object.assign(config,libConfig))

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

		var sigslot=appConfig.sigslot
		listenTo('message',client,config.subscribe,(channel,msg)=>{
			send(sigslot,channel,channel,msg)
		})
		listenTo('pmessage',client,config.psubscribe,(pattern,channel,msg)=>{
			send(sigslot,pattern,channel,msg)
		})
        return next(null, client)
    }
}
