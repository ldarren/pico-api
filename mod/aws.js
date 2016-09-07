var
AWS= require('aws-sdk'),
args= require('pico-args'),
dummyCB=()=>{},
addServices=function(aws,config){
	if (config.ses) aws.ses=new SES(config.ses)
}

function SES(config){
	this.ses=new AWS.SES(config)
	this.config=config
}

SES.prototype={
	send(to,subject,text,opt={},cb=dummyCB){
		if (!to || !to.length) return cb('no recipient')
		if (!subject || !text) return cb('no content')
		var
		cfg=this.config
		params={
			Destination: { /* required */
				ToAddresses: to,
				CcAddresses: opt.cc,
				BccAddresses: opt.bcc
			},
			Message: { /* required */
				Body: { /* required */
					Text:{Data:text,Charset:'utf-8'}
				},
				Subject: { /* required */
					Data: subject, /* required */
					Charset: 'utf-8'
				}
			},
			Source: cfg.sender, /* required */
			ReplyToAddresses: opt.reply,
			ReturnPath: cfg.bounce,
			ReturnPathArn: cfg.retARN || cfg.srcARN,
			SourceArn: cfg.srcARN
		}
		if (opt.html) params.Message.Body.Html={Data:opt.html,Charset:'utf-8'}
		this.ses.sendEmail(params,cb)
	}
}

module.exports={
    create:function(appConfig, libConfig, next){
        var config={
			credPath:'',
			apiVersions:{
				ses:'2010-12-01'
			}
        }

        args.print('SES Options',Object.assign(config,libConfig))

		AWS.config.loadFromPath(config.credPath)
		AWS.config.apiVersions=config.apiVersions

		var aws={}
		addServices(aws,config)

        return next(null, aws)
    }
}
