const
HEADERS= { 'Content-Type': 'application/octet-stream' }

var
http= require('http'),
https= require('https'),
path= require('path'),
sigslot,
request= function(req, res){
    var now = Date.now()
    res.writeHead(200, HEADERS)
    switch(req.method){
    case 'POST': break
    case 'GET': return res.end(''+now)
    default: return res.end()
    }
    if (-1 === req.headers['content-type'].toLowerCase().indexOf('multipart/form-data')){
        bodyparser.parse(req, function(err, orders){
            if (err){
                console.error(err)
                return res.end()
            }
            reply(req, res, orders, now)
        })
    }else{
        multipart.parse(req, function(err, order){
            if (err || !order.api){
                console.error(err || 'empty multipart api')
                return res.end()
            }
            reply(req, res, [order.channel ? [order.channel] : [], order], now)
        })
    }
}

module.exports= {
    create: function(appConfig, libConfig, next){
        var
        pfxPath= libConfig.pfxPath,
        server

        sigslot= appConfig.sigslot

        if (pfxPath){
            pfxPath= path.isAbsolute(pfxPath) ? pfxPath : path.resolve(appConfig.path, pfxPath)
            server= https.createServer({pfx:fs.readFileSync(pfxPath)}, request)
        }else{
            server= http.createServer(request)
        }

        server.listen(libConfig.port, function(){
            if (libConfig.allowOrigin) HEADERS['Access-Control-Allow-Origin']= libConfig.allowOrigin

            next()
        })
    }
}
