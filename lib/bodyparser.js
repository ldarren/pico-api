const
// PACKET TYPE
PT_HEAD = 1,
PT_BODY = 2

var
crypto = require('crypto'),
cullAge, secretKey, sep,
auth = function(head, body, cb){
    if (!body.length) return cb()

    var
    t = head.date,
    dt = Date.now() - t

    if (cullAge && (!t || dt > cullAge || dt < -cullAge)) return cb('timed error request: api['+head.api+']t['+t+']dt['+dt+']')

    if (secretKey){
        var hmac = crypto.createHmac('md5', secretKey+t)
        
        for(var i=0,l=body.length; i<l; i++) hmac.update(body[i]);
        
        var key = hmac.digest('base64')

        if (key !== head.key) return cb('key error request: api['+head.api+']t['+t+']key['+key+']')
    }
    cb()
}

module.exports = {
    setup: function(age, key, delimiter){
        cullAge = age
        secretKey = key
        sep = delimiter
    },
    parse: function(req, cb){
        var
        pt = PT_HEAD,
        data = '',
        endPos = 0,
        sepLen = sep.length,
        orders = [],
        remain = '',
        head, body,
        error = function(err){
            req.pause()
            orders = []
            cb(err)
            cb=undefined
        }

        req.on('data', function(chunk){
            remain += chunk.toString()
            try{
                while(remain){
                    endPos = remain.indexOf(sep)
                    if (-1 === endPos) break
                    switch(pt){
                    case PT_HEAD:
                        head = JSON.parse(remain.substring(0, endPos))
                        orders.push(head)
                        body = []
                        pt = (head.len > 0) ? PT_BODY : PT_HEAD
                        break
                    case PT_BODY:
                        body.push(remain.substring(0, endPos))
                        if (head.len === body.length){
                            pt = PT_HEAD
                            auth(head, body, function(err){
                                if (err){
                                    remain = null
                                    return error(err)
                                }
                                head.data = JSON.parse(body[0], function(k, v){
                                    switch(k[0]){
                                    case '$':
                                    case '_': return body[v]
                                    default: return v
                                    }
                                })
                            })
                        }
                        break
                    }
                    remain = remain.substr(endPos+sepLen)
                }
            }catch(exp){
                return error(exp)
            }
        })
        req.on('end', function(){
            if (cb) cb(orders.length ? null : 'missing or invalid orders', orders)
        })
    },
    error:function(query,err){
        // TODO: better error handling
        query = query || {}
        var
        str = JSON.stringify(err),
        t = Date.now(),
        head = secretKey ? {
            api: query.api || '',
            reqId: query.reqId || 0,
            resId: 0,
            len: 0,     
            date: t,
            key: crypto.createHmac('md5', secretKey+t).update(str).digest('base64'),
            error:null
        } : {
            api: query.api || '',
            reqId: query.reqId || 0,
            resId: 0,
            len: 0,
            error:null
        }
        return JSON.stringify(head).replace('null',str)
    },
    render:function(query,data){
        var
        t = Date.now(),
        body = [],
        head

        body.unshift(JSON.stringify(data||{}, function(k, v){
            switch(k[0]){
            case '$':
            case '_': return body.push(v)
            default: return v
            }
        }))
            
        if(secretKey) {
            var hmac = crypto.createHmac('md5', secretKey+t)
            for(var i=0,l=body.length; i<l; i++) hmac.update(body[i]);
            head = {
                api: query.api,
                reqId: query.reqId,
                resId: 0,
                len: body.length,
                date: t,
                key: hmac.digest('base64')
            }
        }else{
            head = {
                api: query.api,
                reqId: query.reqId,
                resId: 0,
                len: body.length
            }
        }

        return JSON.stringify(head)+sep+body.join(sep)+sep
    }
}
