var
AWS= require('aws-sdk'),
args= require('pico-args'),
addServices=function(aws,config){
	if (config.ses) aws.ses=new SES(config.ses)
}

function SES(config){
	this.ses=new AWS.SES(config)
}

SES.prototype={
	sendMail:function(recipients,subject,text,html,cb){
		var params = {
			Destination: { /* required */
				BccAddresses: [
					'STRING_VALUE',
					/* more items */
				],
				CcAddresses: [
					'STRING_VALUE',
					/* more items */
				],
				ToAddresses: [
					'STRING_VALUE',
					/* more items */
				]
			},
			Message: { /* required */
				Body: { /* required */
					Html: {
						Data: 'STRING_VALUE', /* required */
						Charset: 'STRING_VALUE'
					},
					Text: {
						Data: 'STRING_VALUE', /* required */
						Charset: 'STRING_VALUE'
					}
				},
				Subject: { /* required */
					Data: subject, /* required */
					Charset: 'STRING_VALUE'
				}
			},
			Source: 'STRING_VALUE', /* required */
			ReplyToAddresses: [
				'STRING_VALUE',
				/* more items */
			],
			ReturnPath: 'STRING_VALUE',
			ReturnPathArn: 'STRING_VALUE',
			SourceArn: 'STRING_VALUE'
		}
		this.ses.sendMail(params,cb)
	}
}

module.exports={
    create:function(appConfig, libConfig, next){
        var config={
			credPath:'',
			apiVersions:{
				ses:'2010-12-01'
			},
			ses:{
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
