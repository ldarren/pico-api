/*
 * TODO: split this to 2 parts, server and client to have better mock
 */
const fs = require('fs')
const path = require('path')
const pObj = require('pico-common').export('pico/obj')
const pStr = require('pico-common').export('pico/str')
const radix = new pStr.Radix
const util = require('./util')

const META_SPEC = {
	type: 'object',
	required: 1,
	spec: {
		i: {type: 'number', required: 1},
		s: {type: 'number', required: 1},
		cby: {type: 'number', required: 1},
		cat: {type: 'date', required: 1},
		uby: {type: 'number'},
		uat: {type: 'date'},
	}
}

/**
 * Database class
 *
 * @param {object} host - pipeline object
 * @param {object} cfg - configuration
 *
 * @returns {void} - this
 */
function Database(host, cfg){
	this.host = host
	this.name = cfg.id
	const dir = cfg.dir
	/* eslint-disable no-sync */
	if (!fs.statSync(dir, {throwIfNoEntry: false})) {
		/* eslint-disable no-sync */
		fs.mkdirSync(dir, {recursive: true})
	}
	this.dir = cfg.dir
	this.colls = {}
}

Database.prototype = {
	addColl(name, coll){
		this.colls[name] = coll
	},
	getColl(name){
		return this.colls[name]
	}
}

function map(d, map){
	if (!map) return {}
	return Object.keys(map).reduce((acc, k) => {
		acc[k] = d[map[k]]
		return acc
	}, {})
}

function row(d, meta){
	return Object.assign({}, meta, {d})
}

/**
 * Collection class
 *
 * @param {Database} db - Database instance
 * @param {string} name - collection name
 * @param {object} rs - resource
 * @param {string} rs.db - resource db name, see mod.id
 * @param {string} rs.map - map resource fields to meta
 * @param {object} rs.schema - resource schema
 *
 * @returns {object} - this
 */
function Collection(db, name, rs){
	this.host = db.host
	this.meta = pObj.extends({}, [rs.meta || {}, META_SPEC])
	this.map = rs.map || Object.assign({}, rs.map)
	this.schema = Object.assign({}, rs.schema)
	this.route = rs.route || {}

	this.fname = path.join(db.dir, name + '.json')
	const json = fs.readFileSync(this.fname, {flag: 'a+'})
	const doc = json.length ? JSON.parse(json) : []
	this.documents = []
	const res = pObj.validate({
		type: 'array',
		spec: pObj.extends({}, [{spec: {d: this.schema}}, this.meta])
	}, doc, this.documents)
	if (res) throw `invalid ${name} colllection saved file. error[${res}]`
	this.index = doc.length ? doc[doc.length - 1].i + 1 : 1
}

function request(host, route, body){
	if (!host || !route || !body) return
	const out = {}
	const res = pObj.validate(route[1], body, out)
	if (res) return
	const url = radix.build(route[0], out)
	host.go(url)
}

Collection.prototype = {
	save(){
		fs.writeFileSync(this.fname, JSON.stringify(this.documents))
	},
	select(qs){
		let out = this.documents.slice()
		if (!Array.isArray(qs)) return out
		for (let i = 0, q; (q = qs[i]); i++){
			out = out.filter(item => q.csv.includes(pObj.dot(item, q.index)))
		}
		return out
	},
	insert(input, meta, useri){
		const d = 'array' === this.schema.type ? [] : {}
		let res = pObj.validate(this.schema, input, d)
		if (res) throw `invalid parameter: ${res} in spec: ${JSON.stringify(this.schema)}. input: ${JSON.stringify(input)}`

		const raw = Object.assign({
			i: this.index++,
			s: 1,
			cby: (useri || 0),
			cat: new Date
		}, map(d, this.map), meta)
		const m = {}
		if (this.meta.type){
			res = pObj.validate(this.meta, raw, m)
			if (res) throw `invalid meta: ${JSON.stringify(this.meta)}, ${res}`
		}

		this.documents.push(row(d, m))
		this.save()

		// TODO: should be replace by real queue or cron
		request(this.host, this.route.insert, d)

		return m
	},
	pop(query){
		const output = []
		const docs = this.documents
		for (let i = docs.length, doc; i > 0; i--){
			doc = docs[i]
			if (!doc || !util.match(query, doc.d)) continue
			docs.splice(i, 1)
			output.push(doc)
		}
		this.save()
		return output
	},
	push(input, meta, useri){
		this.insert(input, meta, useri)
	},
	update(i, d, meta, useri){
		const doc = this.documents.find(item => i === item.i)
		if (!doc) return

		const raw = Object.assign(doc, {
			uby: useri || 0,
			uat: new Date
		}, map(d, this.map), meta)
		const m = {}
		if (this.meta.type){
			const res = pObj.validate(this.meta, raw, m)
			if (res) throw `invalid meta: ${JSON.stringify(this.meta)}, ${res}`
		}

		Object.assign(doc, row(d, m))
		this.save()
	},
	remove(i){
		for (let j = 0, d, docs = this.documents; (d = docs[j]); j++){
			if (i === d.i){
				d.s = 0
				d.uat = new Date
				d.uby = 0
				break
			}
		}
		this.save()
	},
	truncate(size){
		this.documents = this.documents.slice(-size)
		this.save()
		return this.documents.length
	}
}

/**
 * Set single record into collection
 *
 * @param {Collection} coll - Collection instance
 * @param {string} i - identity of the record, can be string or number
 * @param {object} input - record to be set
 * @param {object} meta - meta object of data
 * @param {object} useri - creator or updater index
 * @param {object} output - result of the set
 *
 * @returns {void} - undefined
 */
function set(coll, i, input, meta, useri, output){
	if (i){
		coll.update(i, input, meta, useri)
		Object.assign(output, {i})
	}else{
		const res = coll.insert(input, meta, useri)
		Object.assign(output, res)
	}
}

/**
 * Set multiple records into collection
 *
 * @param {Collection} coll - Collection instance
 * @param {Array} is - array of identity of the record, can be string or number
 * @param {Array} inputs - records to be set
 * @param {Array} metas - meta data of recards
 * @param {Array} useri - creator or updater
 * @param {Array} outputs - results of the sets
 *
 * @returns {void} - undefined
 */
function sets(coll, is, inputs, metas, useri, outputs){
	if (is){
		is.forEach((i, ix) => {
			coll.update(i, inputs[ix], metas[ix], useri)
			outputs.push({i})
		})
	}else{
		inputs.forEach((input, ix) => {
			const res = coll.insert(input, metas[ix], useri)
			outputs.push(res)
		})
	}
}

module.exports = {
	setup(host, cfg, rsc, paths){
		const db = new Database(host, cfg)
		return Object.keys(rsc).reduce((acc, name) => {
			const rs = rsc[name]
			if (!rs || db.name !== rs.db) return acc
			const coll = new Collection(db, name, rs)
			db.addColl(name, coll)
			acc[name] = coll
			return acc
		}, {})
	},
	set(coll, i, input, meta, useri, output){
		set(coll, i, input, meta, useri, output)
		return this.next()
	},
	sets(coll, i, input, meta, useri, output){
		if (Array.isArray(input)){
			sets(coll, i, input, meta, useri, output)
		}else{
			set(coll, i, input, meta, useri, output)
		}
		return this.next()
	},
	get(coll, i, output){
		const res = coll.select([{index: ['i'], csv: [i]}])
		Object.assign(output, res[0])
		return this.next()
	},
	find(coll, query, output){
		output.push(...coll.select(query))
		return this.next()
	},
	hide(coll, id){
		coll.remove(id)
		return this.next()
	},
	push(coll, msg){
		coll.push(msg)
		return this.next()
	},
	pop(coll, query, output){
		const msg = coll.pop(query)
		output.push(...msg)
		return this.next()
	},
	truncate(coll, size){
		coll.truncate(size)
		return this.next()
	}
}
