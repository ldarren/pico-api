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

## Run
There are three ways to run picos server

* Run without sandbox or run as master
`npx picos -mp app.dev.json`

* Run with sandbox or run as app
`npx picos -p app.dev.json`

* Run in another nodejs app (good for test framework)
```javascript
const picos = require('picos')
picos({path: ['app.test.json'], master:[1]}, (err, ctx) => {
})
```

to reduce typing, consider add it to package.json
```json
{
	"script": {
		"start": "npx picos -mp"
	}
}
```
then run server with command
`npm start app.dev.json`

## Test
`npm test`

## Features
* Web is not the only first class citizen in this platform, all other modules has similar status
* Routing for web, fs events, redis pubsub, sse and node cluster messagging
* Distributed source files and lazily download files from file server
* use JSON as relational database design tool
* reloading an app without reloading all other apps

## TODO
- [ ] translate from config/src to config/build
- [ ] compile config/src db section to database
- [ ] compile config/src db section to models
- [ ] handling config/src db section update and changes
- [ ] add domain protection to master and slaves
- [x] move mod and theirs dependencies out of picos
