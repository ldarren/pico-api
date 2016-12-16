const
CORS='Access-Control-Allow-Origin',
HEAD_JSON= { 'Content-Type': 'application/octet-stream' },
HEAD_HTML= { 'Content-Type': 'text/html; charset=utf-8' }
HEAD_SSE= {
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
},

http= require('http'),
https= require('https'),
fs= require('fs'),
path= require('path'),
url= require('url'),
PJSON= require('pico-common').export('pico/json'),
args= require('pico-args'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
Session= require('../lib/Session'),
error=function(err, sess, res, query, cb){
	err=err||sess.get('error')
	if (!Array.isArray(err)) err=sess.error(404,err)
	if (!res.headersSent) res.writeHead(err[0], HEAD_JSON)
	res.write(bodyparser.error(query,err[1]))
    sess.set('error') //empty error
    cb()
},
render=function(sess, ack, query, res, req, cred,input, cb){
    sess.commit((err)=>{
        if (err) return error(err, sess, res, query, cb)
        const output=sess.getOutput()
        if (query.api){
            res.write(bodyparser.render(query, output))
        }else if (output){
			if (output.charAt) res.write(output)
			else res.write(JSON.stringify(output))
        }
        cb()
    })
},
renderNext=function(req,res,qs){
	const q=qs.shift()

	sigslot.signal(q.api, Session.TYPE.WEB,q.data,q.cred,req,res,q,null,qs.length?renderStream:renderStop,qs)
},
renderStart=function(ack, query, res, req, cred, input, next){
	if (res.finished) return next()

    const cb=()=>{renderNext(req,res,this.args[0]); next()}
    if (this.has('error')) return error(null, this, res, query, cb)
    res.writeHead(200, HEAD_JSON)
    render(this, ack, query, res, req, cred, input, cb)
},
renderStream=function(ack, query, res, req, cred, input, next){
	if (res.finished) return next()

    const cb=()=>{renderNext(req,res,this.args[0]); next()}
    if (this.has('error')) return error(null, this, res, query, cb)
    render(this, ack, query, res, req, cred, input, cb)
},
renderStop=function(ack, query, res, req, cred, input, next){
	if (res.finished) return next()

    const cb=()=>{res.end(); next()}
    if (this.has('error')) return error(null, this, res, query, cb)
    render(this, ack, query, res, req, cred, input, cb)
},
// TODO: better way to delay error message
renderAll=function(ack, query, res, req, cred, input, next){
	if (res.finished) return next()
    const cb=()=>{res.end(); next()}
    if (this.has('error')) return setTimeout(error, config.errorDelay, null, this, res, query, cb) // only protocol error need delay
    res.writeHead(200, HEAD_JSON)
    render(this, ack, query, res, req, cred, input, cb)
},
web={
	getBody(req,body,next){
		function cb(err, query){
			if (err) return next(err)
			Object.assign(body,query)
			next()
		}
		switch(req.headers['content-type']){
		default: return bodyparser.parseBody(req, cb)
		case 'multipart/form-data': return multipart.parse(req, cb)
		}
	},
    parse(req,res,next){
		const ct=req.headers['content-type']
		if (!ct) return next()
        if (-1===ct.toLowerCase().indexOf('multipart/form-data')){
            bodyparser.parse(req, (err, queries)=>{
                if (err) return next(err)
                let q
                switch(queries.length){
                case 0: break
                case 1:
                    q=queries[0]
                    sigslot.signal(q.api, Session.TYPE.WEB,q.data,q.cred,req,res,q,null,renderAll)
                    break
                default:
                    q=queries.shift()
                    sigslot.signal(q.api, Session.TYPE.WEB,q.data,q.cred,req,res,q,null,renderStart,queries)
                    break
                }

                next()
            })
        }else{
            multipart.parse(req, (err, query)=>{
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, Session.TYPE.WEB, query.data,query.cred, req,res, query,null, renderAll)
                next()
            })
        }
    },
    SSEStart(req, res, next){
        res.addListener('close',disconnect)
        res.addListener('error',disconnect)

        req.socket.setKeepAlive(true)  
        req.socket.setTimeout(0)

        res.writeHead(200, HEAD_SSE)
        next()
    },
    SSE(res, msg, evt, retry){
        res.write(`retry: ${retry||1000}\n`)
        if (evt) res.write(`event: ${evt}\n`)
        res.write(`data: ${PJSON.stringify(msg).join(config.sep)}\n\n`)
    },
    SSEStop(res, next){
        res.end()
        next()
    },
    SSEAbort(err, res, next){
        setTimeout(error, config.errorDelay, err, this, res, null, ()=>{
            res.end()
            next()
        })
    }
},
resetPort=function(port, appConfig, cb){
	if (port) return cb(null, port)

    if (!appConfig.name || !appConfig.id) return cb('no port assigned')
	let unix=`/tmp/${appConfig.name}.${appConfig.id}`
	fs.unlink(unix, ()=>{
		cb(null, unix)
	})
},
disconnect= function(){
console.log('disconnect',arguments)
    sigslot.signal('web.dc', Session.TYPE.WEB, null,null, null,this, null,null, renderAll)
},
request= function(req, res){
	console.log(req.method,req.url)
    let o=url.parse(req.url,true)
    sigslot.signal(o.pathname, Session.TYPE.WEB, null,o.query, req,res, null,null, renderAll)
}

let
config,
sigslot

module.exports= {
    create(appConfig, libConfig, next){
        config={
            pfxPath:null,
            port:0,
            allowOrigin:'localhost',
            sep:['&'],
            secretKey:null,
            cullAge:0,
            uploadWL:[],
            errorDelay:3000
        }
        let pfxPath, server

        args.print('Web Options',Object.assign(config,libConfig))
        config.sep=config.sep.charAt?config.sep:JSON.stringify(config.sep)
        pfxPath= config.pfxPath
        sigslot= appConfig.sigslot

        if (pfxPath){
            pfxPath= path.isAbsolute(pfxPath) ? pfxPath : path.resolve(appConfig.path, pfxPath)
            server= https.createServer({pfx:fs.readFileSync(pfxPath)}, request)
        }else{
            server= http.createServer(request)
        }

        if (config.allowOrigin) HEAD_HTML[CORS]=HEAD_JSON[CORS]=HEAD_SSE[CORS]=config.allowOrigin

        multipart.setup(config.uploadWL)
        bodyparser.setup(config.cullAge, config.secretKey, config.sep)

        resetPort(config.port, appConfig, (err, port)=>{
            server.listen(port, ()=>{

				// WS TEST START
				// BUG: ws.send not working and unable forward ws connection to workers
				/*let
				WebSocketServer= require('ws').Server,
				wss=new WebSocketServer({server:server})
				wss.on('connection', (ws)=>{
					ws.on('message', (message)=>{
						console.log('ws received: %s %d', message, require('cluster').isWorker)
						ws.send(`${message} too!`, (err)=>{if (err) return console.error(err)})
					})
				})*/
				// WS TEST END

                next(null, web)
            })
        })
    }
}
