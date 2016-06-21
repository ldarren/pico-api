var
path=require('path'),
apn=require('apn'),
gcm=require('node-gcm'),
args= require('../lib/args'),
Session= require('../lib/Session'),
picoObj=require('pico').export('pico/obj'),
apnConnected = function(){ console.log('apn connected') },
apnDisconnected = function(){ console.log('apn dc') },
apnTimeout = function(){ console.log('apn timeout') },
apnTransmitted = function(notification, device){ console.log('apn send ok', device.toString('hex')) },
apnTransmissionError = function(errCode, notification, device){ console.log('apn send ko', errCode, device.toString('hex')) },
apnFeedback=function(feedback,sigslot){
    feedback.on('feedback', (items)=>{ // items = [{device, time}]
        sigslot.signal('notifier.feedback', Session.TYPE.NOTIFIER, items, 'apn')
    })
    feedback.on('feedbackError', console.error)
},
gcmCB=function(err, result){
    if (err) console.error('gcm send ko',err)
    else console.log('gcm send ok',result)
},
resolvePath=function(home, apnPath, pro){
    return (path.isAbsolute(apnPath) ? apnPath : path.resolve(home, apnPath)) + (pro?'.pro':'.dev')
},
getType=function(cont){
    if (!cont) return 0
    else if ((Array.isArray(cont) && cont.length) || cont.charAt) return 1
    else if (Object.keys(cont).length) return 2
    return 0
},
Notifier=function(config,sigslot){
    this.options=config.options
    this.gcmKey=config.gcm.key
    this.gcmCli= new gcm.Sender(config.gcm.key)

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

Notifier.prototype={
    broadcast: function(tokens, ids, title, content, options={}, payload){
        Object.assign(options,this.options)
        var type=getType(tokens)
        if (type){
            var msg = new apn.Notification(payload)

            msg.setAlertTitle(title)
            msg.setAlertText(content)
            msg.setLaunchImage(options.icon)
            msg.truncateAtWordEnd=options.truncateAtWordEnd
            msg.expiry = options.ttl ? (Date.now()/1000) + options.ttl : 0,
            msg.priority = options.priority,
            msg.retryLimit = options.retryLimit,
            msg.sound = options.sound
            msg.contentAvailable = options.contentAvailable
            msg.trim()

            var cli=this.apnCli
            if (1===type){
                cli.pushNotification(msg, tokens)
            }else{
                for(var t in tokens){
                    msg.badge=tokens[t]
                    cli.pushNotification(msg, t)
                }
            }
        }
        type=getType(ids)
        if (type){
            var msg = new gcm.Message({
                notification:{
                    title: title,
                    message: content,
                    icon:options.icon,
                    sound:options.sound
                },
                // bug with cordova-plugin-push, title and message should not here
                data:payload||{},
                collapseKey: title || content,
                timeToLive: options.ttl,
                delayWhileIdle: options.priority>5?false:true,
                priority: options.priority>5?'high':'normal',
                contentAvailable: options.contentAvailable?true:false,
                restrictedPackageName:options.packageName
            })

            var
            cli=this.gcmCli,
            retry=-1===options.retryLimit ? 5 : options.retryLimit
            if (1===type){
                cli.send(msg, ids, retry, gcmCB)
            }else{
                for(var t in ids){
                    msg.addData('msgcnt',ids[t])
console.log(this.gcmKey,t)
                    cli.send(msg, t, retry, gcmCB)
                }
            }
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
                production:'pro'===appConfig.env?true:false,
                interval:3600
            },
            // https://github.com/ToothlessGear/node-gcm/blob/master/README.md
            gcm:{
                key:'YOUR_API_KEY_HERE'
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

        var
        apn=config.apn,
        pro=config.apn.production

        apn.key=resolvePath(appConfig.path,apn.key,pro)
        apn.cert=resolvePath(appConfig.path,apn.cert,pro)

        return next(null, new Notifier(config,appConfig.sigslot))
    }
}
