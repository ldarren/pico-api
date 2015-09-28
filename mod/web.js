const HEADERS= { 'Content-Type': 'application/octet-stream' }

var
http= require('http'),
https= require('https'),
path= require('path'),
args= require('../lib/args'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
picoObj=require('pico').export('pico/obj'),
sigslot,
web={
    parse:function(session,order,next){
        var
        req=session.req,
        now=Date.now()

        if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, function(err, query){
                if (err) return next(err)
                order=picoObj.extend(order, query)
            })
        }else{
            multipart.parse(req, function(err, query){
                if (err || !order.api) return next(err || 'empty multipart api')
                order=picoObj.extend(order, query)
            })
        }
    }
},
reply=function(err, evt, order){
    var
    res=evt.res

    if(err){
        console.error(err)
        return res.end()
    }
    res.end('ok')
},
request= function(req, res){
    res.writeHead(200, HEADERS)
    switch(req.method){
    case 'POST': break
    case 'GET': return res.end(''+Date.now())
    default: return res.end()
    }
    sigslot.signal(req.url.substr(1),{req:req,res:res},reply)
}

module.exports= {
    create: function(appConfig, libConfig, next){
        var
        config={
            pfxPath:null,
            port:'80',
            allowOrigin:'localhost',
            delimiter:JSON.stringify(['^']),
            secretKey:null,
            cullAge:0,
            uploadWL:[]
        },
        pfxPath= config.pfxPath,
        server

        picoObj.extend(config,libConfig)

        sigslot= appConfig.sigslot

        if (pfxPath){
            pfxPath= path.isAbsolute(pfxPath) ? pfxPath : path.resolve(appConfig.path, pfxPath)
            server= https.createServer({pfx:fs.readFileSync(pfxPath)}, request)
        }else{
            server= http.createServer(request)
        }

        server.listen(config.port, function(){
            if (config.allowOrigin) HEADERS['Access-Control-Allow-Origin']= config.allowOrigin

            var
            secretKey = config.secretKey || null,
            cullAge = config.cullAge,
            delimiter = config.delimiter ? JSON.stringify(config.delimiter) : '',
            uploadWL = config.uploadWL || []

            multipart.setup(uploadWL)
            bodyparser.setup(cullAge, secretKey, delimiter)

            args.print('Web Options',config)

            next(null, web)
        })
    }
}
