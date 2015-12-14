const
META='.meta',
ENC='utf8',
TYPE_FILE=1,
TYPE_DIR=2,
TYPE_LINK=3

var
fs = require('fs'),
path = require('path'),
args= require('../lib/args'),
dummyCB=()=>{},
normalize=function(root, url){
    var p=path.resolve(root,url)
    if (!p.startsWith(root)) return null
    return p
},
mkdirp=function(arr, i, cb){
    if (arr.length <= i) return cb()
    var url=path.resolve(...(arr.slice(0,++i)))
    fs.mkdir(url, (err)=>{
        if (err){
            // ignore EEXIST
            if (err.errno === -17) return mkdirp(arr, i, cb)
            return cb(err)
        }
        fs.writeFile(path.resolve(url, META), '', ENC, (err)=>{
            if (err) return cb(err)
            mkdirp(arr, i, cb)
        })
    })
},
rmrf=function(list, root, cb){
    if (!list.length) return cb()
    var src=normalize(root,list.pop())
    if (!src) return cb(`invalid source ${url}`)

    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isFile() || stat.isSymbolicLink()) return fs.unlink(src, (err)=>{
            if (err) return cb(err)
            rmrf(list, root, cb)
        })
        if (stat.isDirectory()) return fs.readdir(src,(err,files)=>{
            if (err) return cb(err)
            rmrf(files, src, (err)=>{
                if (err) return cb(err)
                fs.rmdir(src, (err)=>{
                    if (err) return cb(err)
                    rmrf(list, root, cb)
                })
            })
        })
        return cb('invalid file type')
    })
},
copyr=function(list, root, dest, cb){
    if (!list.length) return cb()

    var
    fname=list.pop(),
    src=normalize(root,fname)

    if (!src) return cb(`invalid source ${fname}`)

    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isFile()){
            fs.stat(dest, (err, stat)=>{
                if (err) fs.createReadStream(src).pipe(fs.createWriteStream(dest))
                else fs.createReadStream(src).pipe(fs.createWriteStream(path.resolve(dest, fname)))
                return copyr(list, root, dest, cb)
            })
        }
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            link(path.resolve(src,realPath), path.resolve(dest,fname), (err)=>{
                if (err) return cb(err)
                copyr(list, root, dest, cb)
            })
        })
        if (stat.isDirectory()) return fs.readdir(src,(err,files)=>{
            if (err) return cb(err)
            fs.stat(dest, (err, stat)=>{
                var d=dest
                if (!err){
                    d=path.resolve(dest, fname)
                }
                fs.mkdir(d, (err)=>{
                    if (err) return cb(err)
                    copyr(files, src, d, (err)=>{
                        if (err) return cb(err)
                        copyr(list, root, dest, cb)
                    })
                })
            })
        })
        cb('invalid file type')
    })
},
link=function(src, dst, cb){
    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            link(path.resolve(src,realPath), dst, cb)
        })
        fs.symlink(path.relative(dst,src), dst, cb)
    })
},
findLink=function(arr, root, link, links, cb){
    if (!arr.length) return cb(null, links) 

    var src=normalize(root, arr.pop())
    if (!src) return cb('invalid url', links)

    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            if (path.resolve(src,realPath) === link) links.push(src)
            findLink(arr,root,link,links,cb)
        })
        if (stat.isDirectory()) return fs.readdir(src, (err, files)=>{
            if (err) return cb(err)
            findLink(files, src, link, links, (err)=>{
                if (err) return cb(err)
                findLink(arr, root, link, links, cb)
            })
        })
        
        findLink(arr, root, link, links, cb)
    })
},
getFile=function(src, root, cb){
    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isFile()) return cb(null, src)
        if (stat.isDirectory()) return cb(null, path.resolve(src, META))
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            getFile(path.resolve(src,realPath), root, cb)
        })
    })
}

function FileDB(config){
    this.root = config.root
    this.domainRule = new RegExp(`[\\s\\S]{1,${config.domainDiv}}`,'g')
}

FileDB.prototype = {
    TYPE:{
        FILE:TYPE_FILE,
        DIR:TYPE_DIR,
        LINK:TYPE_LINK
    },
    domain:function(name){
        var arr= name.match(this.domainRule)
        if (!arr) return arr
        return path.resolve(this.root,...arr)
    },
    create:function(url,type,data,cb){
        cb=cb||dummyCB
        var dst=normalize(this.root, url)
        if (!dst) return cb(`invalid dst ${url}`)

        switch(type){
        case TYPE_FILE:
            var arr=path.dirname(dst.substr(this.root.length+1)).split('/')
            arr.unshift(this.root)
            mkdirp(arr, 1, (err)=>{
                fs.writeFile(dst,data,ENC,cb)
            })
            break
        case TYPE_DIR:
            var arr=dst.substr(this.root.length+1).split('/')
            arr.unshift(this.root)
            mkdirp(arr, 1, (err)=>{
                if (err) cb(err)
                fs.writeFile(path.resolve(dst,META),data,ENC,cb)
            })
            break
        case TYPE_LINK:
            var src=normalize(this.root, data)
            if (!src) return cb(`invalid source ${data}`)

            link(src, dst, cb)
            break
        default: return cb('unsupported file type')
        }
    },
    remove:function(url,cb){
        cb=cb||dummyCB
        rmrf([url],this.root, cb)
    },
    read:function(url,cb){
        if (!cb) return

        var p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        getFile(p, this.root, (err, file)=>{
            if (err) return cb(err)
            fs.readFile(file, ENC, cb)
        })
    },
    write:function(url,data,cb){
        cb=cb||dummyCB

        var p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        getFile(p, this.root, (err, file)=>{
            if (err) return cb(err)
            fs.writeFile(file, data, ENC, cb)
        })
    },
    copy:function(from,to,cb){
        cb=cb||dummyCB

        var p=normalize(this.root, to)
        if (!p) return cb(`invalid dest: ${dest}`)

        copyr([from], this.root, p, cb)
    },
    list:function(url,cb){
        if (!cb) return
        var p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)
        fs.readdir(p, cb)
    },
    links:function(url,link,cb){
        if (!cb) return
        findLink([url], this.root, link, [], cb)
    }
}

module.exports={
    create: function(appConfig, libConfig, next){
        var config={ root:__dirname, domainDiv:2 }

        args.print('FileDB Options',Object.assign(config,libConfig))

        return next(null, new FileDB(config))
    }
}
