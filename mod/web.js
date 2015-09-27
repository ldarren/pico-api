const HEADERS= { 'Content-Type': 'application/octet-stream' }

var
http= require('http'),
https= require('https'),
path= require('path'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
picoObj=require('pico').export('pico/obj'),
sigslot,
reply=function(err, evt, order){
    var
    res=evt.res

    if(err){
        console.error(err)
        return res.end()
    }
    res.end('ok')
},
/*
        getChannelId(order.shift(), url.parse(req.url, true).pathname, function(err, channelId, channelPass){
            req = undefined
            createSession(res, channelId, startTime, function(err, session){
                if (channelId) {
                    res[PICO_CHANNEL_ID] = session[SESSION_CHANNEL_ID] = channelId
                    res.write(channelId+' '+channelPass)
                }
                res.write(delimiter)//to simplified protocol, always present a delimiter even no channel
*/
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

            next(null, web)
        })
    }
}
