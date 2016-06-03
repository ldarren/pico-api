// parse arguments to json 
// supported:
// - boolean, -V (false) -v (true)
// - default args
// - group args, -zxf
// - alias
var
path= require('path'),
picoStr= require('pico').export('pico/str'),
beginner= 45,
alias= function(defaults, ret, key){
    var a=defaults[key]
    if ('@'===a[0]) ret[a.substr(1)]=ret[key]
}

module.exports= {
    parse: function(defaults, b){
        var ret= {},val,j,c,t

        defaults= defaults || ret
        b= b || beginner

        for(var key in defaults){
            val=defaults[key][0]
            if ('@'===val){
                val=defaults[defaults[key].substr(1)][0]
            }
            ret[key]= val
        }

        error: {
            for(var i=2,args=process.argv,a; a=args[i]; i++){
                if (a.length < 2) break error
                if (b !== a.charCodeAt(0)) break error
                if (b === a.charCodeAt(1)){
                    a=a.substr(2)
                    t=a.charCodeAt(0)>96
                    a=a.toLowerCase()
                    val=ret[a]
                    if (undefined===val) break error
                    switch(typeof val){
                    case 'boolean': ret[a]= t; break
                    case 'string': ret[a]= args[++i]; break
                    case 'number': ret[a]= parseFloat(args[++i]); break
                    default: break error
                    }
                    alias(defaults, ret, a)
                }else{
                    for(j=1,c; c=a.charAt(j); j++){
                        t=c.charCodeAt(0)>96
                        c=c.toLowerCase()
                        val=ret[c]
                        if (undefined===val) break error
                        switch(typeof val){
                        case 'boolean': ret[c]= t; break
                        case 'string': ret[c]= args[++i]; break
                        case 'number': ret[c]= parseFloat(args[++i]); break
                        default: break error
                        }
                        alias(defaults, ret, c)
                    }
                }
            }
            return ret
        }
        return console.error('Invalid argument',a)
    },
    usage: function(defaults){
        console.log('Usage %s %s [arguments]',path.basename(process.argv[0]),process.argv[1])
        console.log('Arguments:')
        var val,param
        for(var key in defaults){
            val = defaults[key]
            param=key.length > 1 ? '--'+key : '-'+key
            if ('@'===val[0]){
                console.log('%s%s alias of "%s"',param,picoStr.pad(param,30,' '),val.substr(1))
            }else{
                console.log('%s%s %s [%s]',param,picoStr.pad(param,30,' '),val[1],val[0])
            }
        }
    },
    print: function(title, options){
        var
        format='%s\n',
        pwd=['password','passwd','pwd'],
        params=[title]

        for(var k in options){
            format+=' -%s%s %s\n'
            if (-1 === pwd.indexOf(k)) params.push(k, picoStr.pad(k,30,' '),JSON.stringify(options[k]))
            else params.push(k, picoStr.pad(k,30,' '),'*')
        }
        params.unshift(format)
        console.log.apply(console, params)
    }
}
