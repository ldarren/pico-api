var
path = require('path'),
zlib = require('zlib'),
http = require('http'),
https = require('https'),
fs = require('fs'),
url = require('url'),
qs = require('querystring'),
picoObj= require('pico').export('pico/obj')

// to prevent ssl error. see http://stackoverflow.com/questions/11091974/ssl-error-in-nodejs
https.globalAgent.options.secureProtocol = 'SSLv3_method'

module.exports = {

    zip: function(str, cb){
        if ('string' !== typeof(str)) return cb('zip err: no payload: '+typeof(str))
        zlib.deflateRaw(str, function(err, buf){
            cb(err, err || buf.toString('base64'))
        })
    },

    unzip: function(str, cb){
        if ('string' !== typeof(str) || '' === str) return cb('unzip err: no payload: '+typeof(str))
        zlib.inflateRaw(new Buffer(str, 'base64'), function(err, buf){
            cb(err, err || buf.toString())
        })
    },
    // params can be an object or an array of objects
    // if it is an array, objects will be merged, overlapped key will be overrided by later object
    ajax: function(method, href, params, headers, cb, userData){
console.log(method, href, params, headers)
        cb = cb || function(err){if (err) console.error(method, href, params, headers, userData, err)}
        if (!href) return cb('url not defined')

        var
        options = url.parse(href),
        protocol

        switch(options.protocol){
        case 'http:': protocol=http; break
        case 'https:': protocol=https; break
        default: fs.readFile(href, 'utf8', function(err, data){ cb(err, 4, data, userData) }); return
        }

        var
        isGet = 'GET' === (options.method = method.toUpperCase()),
        body = ''

        if (params && 'object' === typeof params){
            if (undefined === params.length){
                body = qs.stringify(params)
            }else{
                var
                merged = {},
                opt = {tidy:1, mergeArr:1}
                for(var i=0,l=params.length; i<l; i++){
                    merged = extend(merged, params[i], opt)
                }
                body = qs.stringify(merged)
            }
        }

        if (isGet){
            options.path += body ? '?' + body : body
            if (headers) options.headers = headers
        }else{
            options.headers = extend(headers || {}, {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': body ? body.length : 0
            })
        }

        var req = protocol.request(options, function(res){
            if (-1 < [301,302,303,305,306,307].indexOf(res.statusCode)) return module.exports.ajax(method,res.headers.location,params,headers,cb,userData)
            res.setEncoding('utf8')
            var data = ''
            res.on('data', function(chunk){
                data += chunk
                cb(null, 3, data, userData)
            })
            res.on('end', function(){
                cb(null, 4, data, userData)
            })
        })

        req.on('error', function(err){
            cb(err, null, null, userData)
        })

        if (!isGet){
            req.write(body)
        }
        req.end()  
    }
}
