const
path = require('path'),
zlib = require('zlib'),
http = require('http'),
https = require('https'),
fs = require('fs'),
url = require('url'),
qs = require('querystring'),
pObj = require('pico-common').export('pico/obj')

module.exports = {

    zip(str, cb){
        if (!str || !str.charAt) return cb(`zip err: no payload: ${typeof str}`)
        zlib.deflateRaw(str, (err, buf)=>{
            cb(err, err || buf.toString('base64'))
        })
    },

    unzip(str, cb){
        if (!str || !str.charAt) return cb(`unzip err: no payload: ${typeof str}`)
        zlib.inflateRaw(Buffer.from(str, 'base64'), (err, buf)=>{
            cb(err, err || buf.toString())
        })
    },
    // params can be an object or an array of objects
    // if it is an array, objects will be merged, overlapped key will be overrided by later object
    ajax(method, href, params, headers, cb, userData){
        cb = cb || ((err)=>{if (err) console.error(method, href, params, headers, userData, err)})
        if (!href) return cb('url not defined')

        const options = url.parse(href)
        let protocol

        switch(options.protocol){
        case 'http:': protocol=http; break
        case 'https:': protocol=https; break
        default: fs.readFile(href, 'utf8', (err, data)=>{ cb(err, 4, data, userData) }); return
        }

        const isGet = 'GET' === (options.method = method.toUpperCase())
        let body = params || ''

        if (params && 'object' === typeof params){
            if (params.length){
                body = qs.stringify(pObj.extends({}, params, {tidy:1, mergeArr:1}))
            }else{
                body = qs.stringify(params)
            }
		}

        if (isGet){
            options.path += body ? '?' + body : body
            if (headers) options.headers = headers
        }else{
            options.headers = Object.assign({
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': body ? body.length : 0
            },headers||{})
        }

        const req = protocol.request(options, (res)=>{
            const
			st=res.statusCode,
			loc=res.headers.location
            if (st>=300 && st<400 && loc) return arguments.callee(method,loc,params,headers,cb,userData)
            res.setEncoding('utf8')
            const err=(300>st || !st) ? null : {error:res.statusMessage,code:st,params:arguments}
            let data = ''
            res.on('data', (chunk)=>{
                data += chunk
                cb(err, 3, data, userData)
            })
            res.on('end', ()=>{
                cb(err, 4, data, userData)
            })
        })

        req.on('error', (err)=>{
            cb({error:err.message,code:500}, 4, null, userData)
        })

        if (isGet) req.end()
        req.end(body)
    }
}
