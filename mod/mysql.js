//TODO: use pool or clusterPool to prevent connection error?
var
mysql = require('mysql'),
args= require('pico-args'),
makeConn = function(client){
    var
    config = client.config,
    conn = mysql.createConnection(config)
    conn.on('error', function(err){
        console.error('mysql conn error', err)
        if ('PROTOCOL_CONNECTION_LOST' === err.code){
            setImmediate(function(){ makeConn(client) })
        }
    })
    conn.connect(function(err){
        if (err) {
            setImmediate(function(){ makeConn(client) })
            return console.error('mysql conn[%s] error[%s]',JSON.stringify(config),err)
        }
        console.log('mysql conn[%s:%d.%s] connected',config.host,config.port,config.database)
        //conn.query('SET NAMES utf8');
    })
    return client.conn = conn
},
Client=function(config, conn){
    this.config=config
    this.conn=conn
    makeConn(this)
}

Client.prototype={
    query(){
        return this.conn.query(...arguments)
    },
    format(){
        return mysql.format(...arguments)
    },
	decode(obj,hash,ENUM){
		var keys=Object.keys(obj)
		for(let i=0,k; k=keys[i]; i++) {
			if (-1===ENUM.indexOf(k)) continue
			obj[k]=hash.key(obj[k])
		}
		return obj 
	},
	decodes(rows,hash,ENUM){
		for(let i=0,r; r=rows[i]; i++){ 
			this.decode(r,hash,ENUM) 
		}
		return rows
	},
	encode(obj,by,hash,INDEX,ENUM){
		var arr=[]
        for(let i=0,k; k=INDEX[i]; i++){ 
			if (-1===ENUM.indexOf(k)) arr.push(obj[k])
			else arr.push(hash.val(obj[k]))
		}
        arr.push(by)
		return arr
	},
	mapDecode(rows=[], output={}, hash, ENUM){
		for(let i=0,r,k; r=rows[i]; i++) {
			k=hash.key(r.k)
			if (-1===ENUM.indexOf(k)) output[k]=r.v1 || r.v2
			else output[k]=hash.key(r.v2)
			r.v1=r.v2=undefined
		}
		return output
	},
    mapDecodes(rows=[], outputs=[], hash, ENUM){
        for(let i=0,o,r; o=outputs[i]; i++){
            r=rows[o.id]
            this.mapDecode(r, o, hash, ENUM)
        }
        return outputs
    },
	mapEncode(obj, by, hash, INDEX, ENUM){
		var
		id=obj.id,
		arr=[]

		for(let i=0,keys=Object.keys(obj),key,k,v; key=keys[i]; i++){
			if(INDEX.indexOf(key)>-1)continue
			k=hash.val(key)
			v=obj[key]
			if (!k || undefined===v) continue
			if (-1===ENUM.indexOf(key)){
				if(v.charAt) arr.push([id,k,v,null,by])
				else arr.push([id,k,null,v,by])
			}else{
				arr.push([id,k,null,hash.val(v),by])
			}
		}
		return arr
	},
	listDecode(rows,key,hash,ENUM){
		var
		k=hash.val(key),
		notEnum=(-1===ENUM.indexOf(key))

		for(let i=0,r; r=rows[i]; i++) {
			if (r.k!==k)continue
			if (notEnum) r[key]=(r.v1 || r.v2)
			else r[key]=hash.key(r.v2)
			r.v1=r.v2=undefined
		}
		return rows
	},
	listEncode(id, key, list, by, hash, INDEX, ENUM){
		if (!key || !list || !list.length) return cb()
		var
		arr=[],
		k=hash.val(key),
		notEnum=(-1===ENUM.indexOf(key))

		if(!k || INDEX.indexOf(key)>-1) return arr
		for(let i=0,v; v=list[i]; i++){
			if (notEnum){
				if(v.charAt) arr.push([id,k,v,null,by])
				else arr.push([id,k,null,v,by])
			}else{
				arr.push([id,k,null,hash.val(v),by])
			}
		}
		return arr
	}
}

module.exports={
    create(appConfig, libConfig, next){
        var config={
            host:'localhost',
            port:3306,
            user:'null',
            password:'null',
            database:'null'
        }

        args.print('MySQL Options',Object.assign(config,libConfig))
        return next(null, new Client(config))
    }
}
