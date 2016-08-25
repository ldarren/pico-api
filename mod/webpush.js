var
path=require('path'),
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
webpushCB=function(err, code, data){
	if (err) return console.error(err)
	console.log(data)
},
resolvePath=function(home, apnPath){
    return (path.isAbsolute(apnPath) ? apnPath : path.resolve(home, apnPath))
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
	if (config.gcm){
		this.gcm={
			url:config.gcm.endpoint,
			header:{
				"Authorization": `key=${config.gcm.key}`,
				"Content-Type": "application/json"
			}
		}
	}
	if (config.moz){
		this.moz={
			url:config.moz.endpoint,
			header:{
				"TTL": `${config.options.ttl}`,
			}
		}
	}
},
mozSend=function(url,header,keys,i,res,cb){
	if (keys.length >=i) return cb()
	utils.ajax('post',url+keys[i],null,header,(err,code,data)=>{
		if (err) return cb(err)
		res.push(data)
		mozSend(url,header,keys,++i,res,cb)
	})
}

WebPush.prototype={
	broadcast: function(tokens, ids, keys, title, content, urlargs, cb){
        var
		opt=this.options,
		cli=this.apnCli

        if (cli && tokens){
            var msg = new apn.Notification()

            msg.setAlertTitle(title)
            msg.setAlertText(content)
            msg.setAlertAction('view')
			msg.urlArgs=urlargs
            msg.truncateAtWordEnd=true
            msg.expiry = options.ttl ? (Date.now()/1000) + options.ttl : 0
            msg.trim()

			cli.pushNotification(msg, tokens)
        }

        if (ids){
			var gcm=this.gcm
			utils.ajax('post',gcm.url,JSON.stringify({registration_ids:ids}),gcm.header,webpushCB)
        }

        if (keys){
			var moz=this.moz
			mozSend(moz.url,moz.header,keys,0,[],webpushCB)
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
				endpoint:'https://updates.push.services.mozilla.com/wpush/v1'
            },
			options:{
				ttl:0
			}
        }

        args.print('Webpush Options',picoObj.extend(config,libConfig))

        var apn=config.apn

        apn.key=resolvePath(appConfig.path,apn.key)
        apn.cert=resolvePath(appConfig.path,apn.cert)

        return next(null, new WebPush(config,appConfig.sigslot))
    }
}
