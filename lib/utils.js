var
path = require('path'),
zlib = require('zlib'),
http = require('http'),
https = require('https'),
url = require('url'),
qs = require('querystring'),
picoObj= require('pico-common').export('pico/obj')

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
    ajax: function(method, href, params, opt, cb, userData){
        cb = cb || function(err){if (err) console.error(method, href, params, options, userData, err)}
        if (!href) return cb('url not defined')

        var
        options = picoObj.extend(url.parse(href),opt),
        isGet = 'GET' === (options.method = method.toUpperCase()),
        protocol = 'http:' === options.protocol ? http : https,
        body = ''

        if ('object' === typeof params){
            if (undefined === params.length){
                body = qs.stringify(params)
            }else{
                var
                merged = {},
                opt = {tidy:1, mergeArr:1}
                for(var i=0,l=params.length; i<l; i++){
                    merged = picoObj.extend(merged, params[i], opt)
                }
                body = qs.stringify(merged)
            }
        }

        if (isGet){
            options.path += body ? '?' + body : body
        }else{
            options.headers = picoObj.extend({
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': body ? body.length : 0
            }, opt.headers)
        }

        var req = protocol.request(options, function(res){
            if (-1 < [301,302,303,305,306,307].indexOf(res.statusCode)) return module.exports.ajax(method,res.headers.location,params,opt,cb,userData)
            res.setEncoding('utf8')
            var data = ''
            res.on('data', function(chunk){
                data += chunk
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
