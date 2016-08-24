var
apn=require('apn'),
args= require('pico-args'),
picoObj=require('pico-common').export('pico/obj'),
utils= require('../lib/utils'),
Session= require('../lib/Session'),
apnConnected = function(){ console.log('apn connected') },
apnDisconnected = function(){ console.log('apn dc') },
apnTimeout = function(){ console.log('apn timeout') },
apnTransmitted = function(notification, device){ console.log('apn send ok', device.toString('hex')) },
apnTransmissionError = function(errCode, notification, device){ console.log('apn send ko', errCode, device.toString('hex')) },
apnFeedback=function(feedback,sigslot){
    feedback.on('feedback', (items)=>{ // items = [{device, time}]
        sigslot.signal('webpush.feedback', Session.TYPE.WEBPUSH, items, 'apn')
    })
    feedback.on('feedbackError', console.error)
},
resolvePath=function(home, apnPath, pro){
    return (path.isAbsolute(apnPath) ? apnPath : path.resolve(home, apnPath)) + (pro?'.pro':'.dev')
},
WebPush=function(config,sigslot){
    this.options=config.options

    if (config.apn){
        var apnCli=this.apnCli = new apn.Connection(config.apn)
        apnCli.on('connected', apnConnected)
        apnCli.on('disconnected', apnDisconnected)
        apnCli.on('timeout', apnTimeout)
        apnCli.on('transmitted', apnTransmitted)
        apnCli.on('transmissionError', apnTransmissionError)
        apnCli.on('socketError', console.error)

        // Setup a connection to the feedback service using a custom interval (10 seconds)
        apnFeedback(new apn.feedback(config.apn), sigslot)
    }
}

WebPush.prototype={
	broadcast: function(tokens, ids, keys, title, content, urlargs){
        Object.assign(options,this.options)
        var cli=this.apnCli
        if (cli && tokens){
            var msg = new apn.Notification()

            msg.setAlertTitle(title)
            msg.setAlertText(content)
            msg.setAlertAction('view')
            msg.truncateAtWordEnd=options.truncateAtWordEnd
            msg.expiry = options.ttl ? (Date.now()/1000) + options.ttl : 0,
            msg.trim()

			cli.pushNotification(msg, tokens)
        }
        if (ids){
			utils.ajax('post','https://android.googleapis.com/gcm/send',{registration_ids:ids},{
				"Authorization": "key=AIzaSyCq_Er3AbH98OW2SPPG9cc5I1PSok6nnj4",
				"Content-Type": "application/json"
			},(err)=>{
				if (err) return console.error(err)
				console.log(arguments)
			})
        }
	}
}

module.exports= {
    create: function(appConfig, libConfig, next){
        var config={
            // https://github.com/argon/node-apn/blob/master/doc/connection.markdown
            // https://github.com/argon/node-apn/blob/master/doc/feedback.markdown
            apn:{
                key:'apn_key.pem',
                cert:'apn_cert.pem',
				production:true,
                interval:3600
            },
            gcm:{
				endpoint:'https://android.googleapis.com/gcm/send',
                key:'YOUR_API_KEY_HERE'
            },
			moz:{
			},
            // https://github.com/argon/node-apn/blob/master/doc/notification.markdown
            // https://github.com/ToothlessGear/node-gcm/blob/master/lib/message-options.js
            options:{
                sound:'default',
                icon:'ic_launcher',
                ttl:0,
                priority: 10,
                retryLimit:-1,
                contentAvailable:1,
                truncateAtWordEnd:1,
                packageName: 'com.domain.project.env'
            }
        }

        args.print('Notifier Options',picoObj.extend(config,libConfig))

        var apn=config.apn

        apn.key=resolvePath(appConfig.path,apn.key)
        apn.cert=resolvePath(appConfig.path,apn.cert)

        return next(null, new WebPush(config,appConfig.sigslot))
    }
}
