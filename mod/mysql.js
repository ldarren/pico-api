//TODO: use pool or clusterPool to prevent connection error?
var
mysql = require('mysql'),
args= require('../lib/args'),
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
    query: function(){
        this.conn.query.apply(this.conn, arguments)
    }
}

module.exports={
    create: function(appConfig, libConfig, next){
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
