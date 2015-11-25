const
META='.meta',
TYPE_FILE=1,
TYPE_DIR=2,
TYPE_LINK=3

var
fs = require('fs'),
path = require('path'),
args= require('../lib/args')

function FileDB(config){
    this.root = config.root
}

FileDB.prototype = {
    TYPE:{
        FILE:TYPE_FILE,
        DIR:TYPE_DIR,
        LINK:TYPE_LINK
    },
    create:function(url,type,data,cb){
        var p=path.resolve(this.root,url)

        switch(type){
        case TYPE_FILE:
            fs.mkdir(path.dirname(p), function(err){
                fs.writeFile(p,data,cb)
            })
            break
        case TYPE_DIR:
            fs.mkdir(p, function(err){
                if (err) cb(err)
                fs.writeFile(path.resolve(p,META),data,cb)
            })
            break
        default: return cb('unsupported file type')
        }
    },
    remove:function(url,cb){
        var f=path.resolve(this.root,url)
        fs.lstat(f, function(err, stat){
console.log(f, err, stat)
            if (err) return cb(err)
            if (stat.isFile() || stat.isSymbolicLink()){
                fs.unlink(f, cb)
            }else if (stat.isDirectory()){
                fs.rmdir(f, cb)
            }else{
                cb('invalid file type')
            }
        })
        fs.unlink(path.resolve(this.root,url),cb)
    },
    read:function(url,cb){
    },
    update:function(url,data,cb){
    },
    link:function(fromUrl,toUrl,cb){
    },
    list:function(url,depth,cb){
    },
    find:function(url,key,cb){
    }
}

module.exports={
    create: function(appConfig, libConfig, next){
        var config={ root:__dirname }

        args.print('FileDB Options',Object.assign(config,libConfig))

        return next(null, new FileDB(config))
    }
}
