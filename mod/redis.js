// TODO: must contained pubsub communication channel, reuse pipeline feature?
const
SESSION_TYPE='redis',
redis = require('redis'),
args= require('pico-args'),
Session= require('../lib/Session'),
send=function(sigslot,pattern,channel,msg){
	let input
	try{input=JSON.parse(msg)}
	catch(exp){input,msg}
    sigslot.signal(pattern, SESSION_TYPE,input,channel)
},
listenTo=function(evt,client,channels,cb){
	if (!channels || !channels.length) return
	client.on(evt,cb)
	client.subscribe(...channels)
}

Session.addType(SESSION_TYPE, ['input','channel'])

module.exports={
    create:function(appConfig, libConfig, next){
        const config={
            host:'localhost',
            port:6379,
            database:0,
            password:null,
            options:null
        }

        args.print('Redis Options',Object.assign(config,libConfig))

        const client = redis.createClient(config.port, config.host, config.options)
        if (config.password) client.auth(config.password)
        client.select(config.database)

        // node_redis handles reconnection only if error event is listened
        client.on('error', (err)=>{
            console.error('redis conn[%s:%d.%d] error:%s',config.host,config.port,config.database,err)
        })
        client.on('end', ()=>{
            console.log('redis conn[%s:%d.%d] end',config.host,config.port,config.database)
        })
        client.on('reconnecting', ()=>{
            console.log('redis conn[%s:%d.%d] reconnecting...',config.host,config.port,config.database)
        })
        client.on('connect', ()=>{
            console.log('redis conn[%s:%d.%d] connected',config.host,config.port,config.database)
        })

		const sigslot=appConfig.sigslot
		listenTo('message',client,config.subscribe,(channel,msg)=>{
			send(sigslot,channel,channel,msg)
		})
		listenTo('pmessage',client,config.psubscribe,(pattern,channel,msg)=>{
			send(sigslot,pattern,channel,msg)
		})
        return next(null, client)
    }
}
