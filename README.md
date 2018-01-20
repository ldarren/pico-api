# pico-api
A lean API server

## Setup
* installation
` npm i picos -g `

and create following files in your working folder
* create `app.json` config file
```json
{
    "app":{
        "actions": [
            "action.json"
        ]
    },
    "mods":{
        "webServer":{
            "mod":"web",
            "port":8000
        }
    }
}
```
* create `action.json` action config file
```json
{
    "deps":{
        "act":"./action"
    },
    "routes":{
        "/":[
            ["act","hello","res"],
            []
		]
    }
}
```
* create `action.js` action file
```javascript
module.exports={
    setup(context, cb){
        cb()
    },
    hello(res, next){
		res.setHeader('connection','close')
        this.setOutput('Hello World!')
		next()
    }
}
```
* create an empty api index config file, `api/index.json`
```javascript
{
	"deps":{},
	"routes":{}
}
```
* create an empty model index file, `model/index.js`
```javascript
return {
}
```

## Run
`npx picos -p app.json`

## Features
* Web is not the only first class citizen in this platform, all other modules has similar status
* Routing for web, fs events, redis pubsub, sse and node cluster messagging
* Distributed source files and lazily download files from file server
* use JSON as relational database design tool
* reloading an app without reloading all other apps

## TODO
-[] translate from config/src to config/build
-[] compile config/src db section to database
-[] compile config/src db section to models
-[] handling config/src db section update and changes
-[] add domain protection to master and slaves
-[X] move mod and theirs dependencies out of picos
