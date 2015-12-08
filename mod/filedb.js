const
META='.meta',
TYPE_ORG=1,
TYPE_FILE=2,
TYPE_DIR=3,
TYPE_LINK=4

var
fs = require('fs'),
path = require('path'),
args= require('../lib/args')

function FileDB(config){
    this.root = config.root
    this.orgNameDiv = config.orgNameDiv
}

FileDB.prototype = {
    TYPE:{
        ORG:TYPE_ORG,
        FILE:TYPE_FILE,
        DIR:TYPE_DIR,
        LINK:TYPE_LINK
    },
    create:function(url,type,data,cb){
        var p=path.resolve(this.root,url)

        switch(type){
        case TYPE_ORG:
            var orgURL= url.match(/[\s\S]{1,3}/g)
            if (!orgURL) return cb('unsupported empty org')
            break
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
        case TYPE_LINK: break
        default: return cb('unsupported file type')
        }
    },
    remove:function(url,cb){
        var f=path.resolve(this.root,url)
        fs.lstat(f, function(err, stat){
            if (err) return cb(err)
            if (stat.isFile() || stat.isSymbolicLink()){
                return fs.unlink(f, cb)
            }else if (stat.isDirectory()){
                return fs.rmdir(f, cb)
            }else{
                return cb('invalid file type')
            }
        })
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
        var config={ root:__dirname, orgNameDiv:2 }

        args.print('FileDB Options',Object.assign(config,libConfig))

        return next(null, new FileDB(config))
    }
}
