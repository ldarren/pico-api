const
MOD_STAT=	0x8000,
MOD_DIR=	0xC000,
MOD_LINK=	0xA000,
MOD_U_R=	0x8400,
MOD_U_W=	0x8200,
MOD_U_X=	0x8100,
MOD_G_R=	0x8440,
MOD_G_W=	0x8220,
MOD_G_X=	0x8110,
MOD_G_RX=	MOD_G_R  | MOD_G_X,
MOD_G_RWX=	MOD_G_RX | MOD_G_W
MOD_O_R=	0x8444,
MOD_O_W=	0x8222,
MOD_O_X=	0x8111,
MOD_O_RX=	MOD_O_R  | MOD_O_X,
MOD_O_RWX=	MOD_O_RX | MOD_O_W,

SET=	'INSERT INTO `grp` (`p`,`n`,`m`,`node`,`root`,`cby`) VALUES (?,?,?,?,?,?);',

mysql = require('./mysql'),
modBuf=Buffer.alloc(2),
MyGroup=function(client){
	this.mysql=client
}

MyGroup.prototype={
	MOD:{
		STAT:	MOD_STAT,
		DIR:	MOD_DIR,
		LINK:	MOD_LINK,
		G_R:	MOD_G_R,
		G_W:	MOD_G_W,
		G_X:	MOD_G_X,
		G_RX:	MOD_G_RX,
		G_RWX:	MOD_G_RWX,
		O_R:	MOD_O_R,
		O_W:	MOD_O_W,
		O_X:	MOD_O_X,
		O_RX:	MOD_O_RX,
		O_RWX:	MOD_O_RWX
	},
	mk(path,name,mod,data,by,cb){
		modBuf.writeUInt16LE(mod)
		this.mysql.query(SET,[path,name,modBuf,JSON.stringify(data),JSON.stringify([by]),by],cb)
	},
	rm(){
	},
	mod(){
	},
	chmod(){
	},
	chown(){
	},
	ls(){
	},
	lsl(){
	},
	touch(){
	},
	cat(){
	},
	vi(){
	}
}

module.exports={
    create(appConfig, libConfig, next){
		mysql.create(appConfig, libConfig, (err,client)=>{
			if (err) return next(err)
			next(null, new MyGroup(client))
		})
    }
}
