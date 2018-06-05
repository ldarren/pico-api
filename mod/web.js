const
SESSION_TYPE='web',
CORS='Access-Control-Allow-Origin',
CT='Content-Type',
HEAD_PICO= { [CT]: 'application/octet-stream' },
HEAD_STD= {}, //{ [CT]: 'text/plain; charset=utf-8' },
HEAD_SSE= {
    [CT]: 'text/event-stream',
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
Session= require('picos-session'),
bodyparser= require('../lib/bodyparser'),
multipart= require('../lib/multipart'),
writeHead=function(res,query,code){
	if (res.headersSent) return
	res.writeHead(code, query.api ? HEAD_PICO : HEAD_STD)
},
writeBody=function(res,output){
	if (output){
		if (output.charAt) res.write(output)
		else res.write(JSON.stringify(output))
	}
},
error=function(err, sess, res, query, cb){
	err=err||sess.get('error')
	if (!Array.isArray(err)) err=sess.error(404,err)
	writeHead(res,query,err[0])
	writeBody(res, query.api ? bodyparser.error(query, err) : err)
    sess.set('error') //empty error
    cb()
},
render=function(sess, ack, query, res, req, cred,input, cb){
    sess.commit((err)=>{
        if (err) return error(err, sess, res, query, cb)
        const output=sess.getOutput()
		writeBody(res, query.api ? bodyparser.render(query, output) : output)
        cb()
    })
},
renderNext=function(req,res,qs){
	const q=qs.shift()

	sigslot.signal(q.api, SESSION_TYPE,q.data,q.cred,req,res,q,null,qs.length?renderStream:renderStop,qs)
},
renderStart=function(ack, query, res, req, cred, input, next){
	if (res.finished) return next()

    const cb=()=>{renderNext(req,res,this.args[0]); next()}
    if (this.has('error')) return error(null, this, res, query, cb)
	writeHead(res,query,200)
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
	writeHead(res,query,200)
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
				if (!queries.length) return next()
                const q=queries.shift()
console.log(req.method,req.url,q.api)
                if(queries.length){
                    sigslot.signal(q.api, SESSION_TYPE,q.data,q.cred,req,res,q,null,renderStart,queries)
				}else{
                    sigslot.signal(q.api, SESSION_TYPE,q.data,q.cred,req,res,q,null,renderAll)
                }

                next()
            })
        }else{
            multipart.parse(req, (err, query)=>{
                if (err || !query.api) return next(err || 'empty multipart api')
                sigslot.signal(query.api, SESSION_TYPE, query.data,query.cred, req,res, query,null, renderAll)
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
    sigslot.signal('web.dc', SESSION_TYPE, null,null, null,this, null,null, renderAll)
},
request= function(req, res){
    let o=url.parse(req.url,true)
    sigslot.signal(o.pathname, SESSION_TYPE, null,o.query, req,res, o.query,null, renderAll)
}

Session.addType(SESSION_TYPE, ['input','cred','req','res','query','ack','render'])

let
config,
sigslot

module.exports= {
    create(appConfig, libConfig, next){
        config={
            pfxPath:null,
            port:0,
            allowOrigin:'localhost',
			contentType: '',
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

        if (config.allowOrigin) HEAD_STD[CORS]=HEAD_PICO[CORS]=HEAD_SSE[CORS]=config.allowOrigin
        if (config.contentType) HEAD_STD[CT]=HEAD_PICO[CT]=HEAD_SSE[CT]=config.contentType

        multipart.setup(config.uploadWL)
        bodyparser.setup(config.cullAge, config.secretKey, config.sep)

        resetPort(config.port, appConfig, (err, port)=>{
            server.listen(port, ()=>{
                next(null, web)
            })
        })
    }
}
