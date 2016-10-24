const
META='.meta',
ENC='utf8',
EMPTY='',
MODE=0o700,
META_OPT={encoding:ENC,mode:MODE},

TYPE_FILE=1,
TYPE_DIR=2,
TYPE_LINK=3,

// G:user in group, A:all, X:browse group, R:read user, W:create subgroup
G_R=0o040,
G_W=0o020,
G_X=0o010,
G_RX=0o050,
G_WRX=0o070,
A_R=0o044,
A_W=0o022,
A_X=0o011,
A_RX=0o055,
A_WRX=0o077,

fs = require('fs'),
path = require('path'),
args= require('pico-args'),
SEP=path.sep,
dummyCB=()=>{},
normalize=function(root){
    let p=path.resolve(...arguments)
    if (!p.startsWith(root)) return null
    return p
},
mkdir=function(url, mode, cb){
    fs.mkdir(url, mode, (err)=>{
        // ignore EEXIST
        if (err && err.errno !== -17) return cb(err)
		cb()
    })
},
mkdirp=function(arr, i, mode, cb){
    if (arr.length <= i) return cb()
    let url=path.resolve(...(arr.slice(0,++i)))
    mkdir(url, mode, (err)=>{
        if (err) return cb(err)
		mkdirp(arr, i, mode, cb)
    })
},
rmrf=function(list, root, cb){
    if (!list.length) return cb()
    let src=normalize(root,list.pop())
    if (!src) return cb(`invalid source ${url}`)

    fs.lstat(src, (err, stat)=>{
		if (err)
			if(-2===err.errno) return rmrf(list, root, cb)
			else return cb(err)
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
            return link(path.resolve(src,realPath), dst, cb)
        })
		rmrf([path.basename(dst)],path.dirname(dst),(err)=>{
			if (err) return cb(err)
			fs.symlink(src, dst, cb)
		})
    })
},
findLink=function(arr, root, link, cb){
    if (!arr.length) return cb() 

    let src=normalize(root, arr.pop())
    if (!src) return cb('invalid url')

    fs.lstat(src, (err, stat)=>{
		if (err)
			if(-2===err.errno) return findLink(arr, root, link, cb)
			else return cb(err)
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            if (!path.relative(realPath,link)) return cb(null, src)
            findLink(arr,root,link,cb)
        })
        if (stat.isDirectory()) return fs.readdir(src, (err, files)=>{
            if (err) return cb(err)
            findLink(files, src, link, (err, found)=>{
                if (err || found) return cb(err, found)
                findLink(arr, root, link, cb)
            })
        })
        findLink(arr, root, link, cb)
    })
},
findLinks=function(arr, root, link, links, cb){
    if (!arr.length) return cb(null, links) 

    let src=normalize(root, arr.pop())
    if (!src) return cb('invalid url', links)

    fs.lstat(src, (err, stat)=>{
		if (err)
			if(-2===err.errno) return findLinks(arr, root, link, links, cb)
			else return cb(err)
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            if (path.resolve(src,realPath) === link) links.push(src)
            findLinks(arr,root,link,links,cb)
        })
        if (stat.isDirectory()) return fs.readdir(src, (err, files)=>{
            if (err) return cb(err)
            findLinks(files, src, link, links, (err)=>{
                if (err) return cb(err)
                findLinks(arr, root, link, links, cb)
            })
        })
        
        findLinks(arr, root, link, links, cb)
    })
},
getFilename=function(src, cb, type){
    fs.lstat(src, (err, stat)=>{
        if (err) return cb(err)
        if (stat.isFile()) return cb(null, src, type||TYPE_FILE)
        if (stat.isDirectory()) return cb(null, path.resolve(src, META), type||TYPE_DIR)
        if (stat.isSymbolicLink()) return fs.readlink(src, (err, realPath)=>{
            if (err) return cb(err)
            getFilename(path.resolve(src,realPath), cb, TYPE_LINK)
        })
    })
}

function FSysDB(config){
    this.root = config.root
    this.pathRule = new RegExp(`[\\s\\S]{1,${config.nameLength}}`,'g')
}

FSysDB.prototype = {
	META:META,
    TYPE:{
        FILE:TYPE_FILE,
        DIR:TYPE_DIR,
        LINK:TYPE_LINK
    },
    MODE:{
		NONE:0,
		G_R,
		G_W,
		G_X,
		G_RX,
		G_WRX,
		A_R,
		A_W,
		A_X,
		A_RX,
		A_WRX
    },
	join:path.join,
	split(url){
		if (!url||!url.split) return []
		return url.split(SEP)
	},
    path(){
		let ns=[], arr=[], i, n
		for(i=0; n=arguments[i]; i++){
			if (n.split) ns.push(...(n.split(SEP)))
			else ns.push(n.toString())
		}
		for(i=0; n=ns[i]; i++){
			arr.push(...n.match(this.pathRule))
		}
        return path.join(...arr)+SEP
    },
    // node bug? a+w is never allow
	// mkdir -p
    createp(url,data,type,mode,cb){
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

		let arr

        switch(type){
        case TYPE_FILE:
            arr=path.dirname(dst.substr(this.root.length+1)).split(SEP)
            arr.unshift(this.root)
            mkdirp(arr, 1, mode, (err)=>{
                fs.writeFile(dst,data,{encoding:ENC,mode:mode},cb)
            })
            break
        case TYPE_DIR:
            arr=dst.substr(this.root.length+1).split(SEP)
            arr.unshift(this.root)
            mkdirp(arr, 1, mode, (err)=>{
                if (err) cb(err)
                fs.writeFile(path.resolve(dst,META),data,META_OPT,cb)
            })
            break
        case TYPE_LINK:
            let src=normalize(this.root, data)
            if (!src) return cb(`invalid source ${data}`)
            arr=path.dirname(dst.substr(this.root.length+1)).split(SEP)
            arr.unshift(this.root)
            mkdirp(arr, 1, mode, (err)=>{
				if (err) return cb(err)
				link(src, dst, cb)
			})
            break
        default: return cb('unsupported file type')
        }
    },
	create(root,name,data,type,mode,cb){
        switch(arguments.length){
        case 6: break
        case 5:
            if ('function' === typeof mode){
                cb=mode
                mode=MODE
            }
            break
        case 4: mode=MODE; break
        default: return console.error('not enough params')
        }
        mode=mode|MODE
        cb=cb||dummyCB

        let dst=normalize(this.root, root, name)
        if (!dst) return cb(`invalid dst ${path.join(root,name)}`)

		let arr,src

        switch(type){
        case TYPE_FILE:
			fs.writeFile(dst,data,{encoding:ENC,mode:mode},cb)
            break
        case TYPE_DIR:
			mkdir(dst, mode, (err)=>{
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
        rmrf([url],this.root, cb||dummyCB)
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

        getFilename(p, (err, fname, type)=>{
            if (err) return cb(err)
            fs.readFile(fname, ENC, (err, data)=>{
				cb(err, data, type)
			})
        })
    },
    write(url,data,cb){
        cb=cb||dummyCB

        let p=normalize(this.root, url)
        if (!p) return cb(`invalid url: ${url}`)

        getFilename(p, (err, fname)=>{
            if (err) return cb(err)
            fs.writeFile(fname, data, ENC, cb)
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
    findLink(link,root,urls,cb){
        if (!cb) return
        findLink(Array.isArray(urls)?urls:[urls], path.join(this.root,root), path.join(this.root,link), cb)
    },
	//TODO: make findLinks works like findLink
    findLinks(urls,link,cb){
        if (!cb) return
        findLinks(Array.isArray(urls)?urls:[urls], this.root, link, [], cb)
    }
}

module.exports={
    create(appConfig, libConfig, next){
        let config={ root:__dirname, nameLength:2 }

        args.print('FSysDB Options',Object.assign(config,libConfig))

        return next(null, new FSysDB(config))
    }
}
