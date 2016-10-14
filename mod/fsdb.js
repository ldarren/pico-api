const
META='.meta',
ENC='utf8',
EMPTY='',
MODE=0o700,
META_OPT={encoding:ENC,mode:MODE},
TYPE_FILE=1,
TYPE_DIR=2,
TYPE_LINK=3,
G_R_OK=0o040,
G_W_OK=0o020,
G_X_OK=0o010,
A_R_OK=0o004,
A_W_OK=0o002,
A_X_OK=0o001

let
fs = require('fs'),
path = require('path'),
args= require('pico-args'),
dummyCB=()=>{},
normalize=function(root, url){
    let p=path.resolve(root,url)
    if (!p.startsWith(root)) return null
    return p
},
mkdirp=function(arr, i, mode, cb){
    if (arr.length <= i) return cb()
    let url=path.resolve(...(arr.slice(0,++i)))
    fs.mkdir(url, mode, (err)=>{
        if (err){
            // ignore EEXIST
            if (err.errno === -17) return mkdirp(arr, i, mode, cb)
            return cb(err)
        }
		mkdirp(arr, i, mode, cb)
    })
},
rmrf=function(list, root, cb){
    if (!list.length) return cb()
    let src=normalize(root,list.pop())
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

    let
    fname=list.pop(),
    src=normalize(root,fname)

    if (!src) return cb(`invalid source ${fname}`)

    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isFile()){
            fs.stat(dest, (err)=>{
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
            fs.stat(dest, (err)=>{
                let d=dest
                if (!err){
                    d=path.resolve(dest, fname)
                }
                fs.mkdir(d, stat.mode, (err)=>{
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

    let src=normalize(root, arr.pop())
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
    this.pathRule = new RegExp(`[\\s\\S]{1,${config.nameLength}}`,'g')
}

FileDB.prototype = {
	META:META,
    TYPE:{
        FILE:TYPE_FILE,
        DIR:TYPE_DIR,
        LINK:TYPE_LINK
    },
    MODE:{
        G_R:G_R_OK,
        G_W:G_W_OK,
        G_X:G_X_OK,
        A_R:A_R_OK,
        A_W:A_W_OK,
        A_X:A_X_OK
    },
    path(name){
		let
		ns=Array.isArray(name)?name:name.split(path.sep),
		arr=[]
		for(let i=0,n; n=ns[i]; i++){
			arr.push(...n.match(this.pathRule))
		}
        return path.join(...arr)+path.sep
    },
    // node bug? a+w is never allow
    create(url,data,type,mode,cb){
        switch(arguments.length){
        case 5: break
        case 4:
            if ('function' === typeof mode){
                cb=mode
                mode=MODE
            }
            break
        case 3: mode=MODE; break
        default: return console.error('not enough params')
        }
        mode=mode|MODE
        cb=cb||dummyCB

        let dst=normalize(this.root, url)
        if (!dst) return cb(`invalid dst ${url}`)

		let arr,src

        switch(type){
        case TYPE_FILE:
            arr=path.dirname(dst.substr(this.root.length+1)).split('/')
            arr.unshift(this.root)
            mkdirp(arr, 1, mode, (err)=>{
                fs.writeFile(dst,data,{encoding:ENC,mode:mode},cb)
            })
            break
        case TYPE_DIR:
            arr=dst.substr(this.root.length+1).split('/')
            arr.unshift(this.root)
            mkdirp(arr, 1, mode, (err)=>{
                if (err) cb(err)
                fs.writeFile(path.resolve(dst,META),data,META_OPT,cb)
            })
            break
        case TYPE_LINK:
            src=normalize(this.root, data)
            if (!src) return cb(`invalid source ${data}`)

            link(src, dst, cb)
            break
        default: return cb('unsupported file type')
        }
    },
    remove(url,cb){
        cb=cb||dummyCB
        rmrf([url],this.root, cb)
    },
    rename(from,to,cb){
        cb=cb||dummyCB
        let
        fromP=normalize(this.root, from),
        toP=normalize(this.root, to)

        if (!fromP || !toP) return cb(`invalid fromURL:${from} or toURL:${to}`)

        fs.rename(fromP,toP,cb)
    },
    chmod(url,mod,cb){
        cb=cb||dummyCB

        let p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        fs.stat(p,(err,stat)=>{
            if (err) return cb(err)
            fs.chmod(p,MODE|mod,cb)
        })
    },
    mode(url,cb){
        if (!cb) return

        let p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        fs.stat(p,(err,stat)=>{
            if (err) return cb(err)
            cb(null, stat.mode)//parseInt(stat.mode.toString(8), 10))
        })
    },
    read(url,cb){
        if (!cb) return

        let p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        getFile(p, this.root, (err, file)=>{
            if (err) return cb(err)
            fs.readFile(file, ENC, cb)
        })
    },
    write(url,data,cb){
        cb=cb||dummyCB

        let p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        getFile(p, this.root, (err, file)=>{
            if (err) return cb(err)
            fs.writeFile(file, data, ENC, cb)
        })
    },
    copy(from,to,cb){
        cb=cb||dummyCB

        let p=normalize(this.root, to)
        if (!p) return cb(`invalid dest: ${dest}`)

        copyr([from], this.root, p, cb)
    },
    list(url,cb){
        if (!cb) return
        let p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)
        fs.readdir(p, cb)
    },
    links(url,link,cb){
        if (!cb) return
        findLink([url], this.root, link, [], cb)
    }
}

module.exports={
    create(appConfig, libConfig, next){
        let config={ root:__dirname, nameLength:2 }

        args.print('FileDB Options',Object.assign(config,libConfig))

        return next(null, new FileDB(config))
    }
}
