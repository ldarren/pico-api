const fs = require('fs')
const path = require('path')
const pico = require('pico-common')
const psUtil = require('picos-util')
const pObj = pico.export('pico/obj')
const symPath = process.argv[1]

pico.ajax = psUtil.ajax

const fopt = {encoding: 'utf8'}

let PD

/**
 * Get picos directory. the PD is a abs, none symbolic link and contains the picos index.js
 *
 * @param {Function} cb - call back
 *
 * @returns {void} - undefined
 */
function getPD(cb){
	if (PD) return cb(PD)
	fs.readlink(symPath, (err, relPath) => {
		if (err) PD = symPath
		else PD = path.resolve(symPath, realPath)
		cb(path.dirname(PD))
	})
}

/**
 * Get resolved path with working directory, file name and default extension
 *
 * @param {string} wd - working directory
 * @param {string} file - filename
 *
 * @returns {string} - file path
 */
function getPath(wd, file){
	return path.resolve(wd, file)
}

/**
 * Read multiple files and place the into a list
 *
 * @param {string} wd - working directory
 * @param {Array} fnames - a list of filenames
 * @param {Array} list - a list of file
 * @param {Function} cb - callback
 *
 * @returns {void} - undefined
 */
function readPages(wd, fnames, list, cb){
	if (!fnames.length) return cb(null, list)

	const fpath = getPath(wd, fnames.shift())
	fs.readFile(fpath, fopt, (err, txt) => {
		if (err) return cb(err)
		pico.parse(fpath, txt, (err, mod) => {
			if (err) return cb(err)
			list.push(mod)
			readPages(wd, fnames, list, cb)
		})
	})
}

/**
 * Read files listed in an index file
 *
 * @param {string} wd - working diretory
 * @param {string} index - index file name
 * @param {Function} cb - callback
 *
 * @returns {void} - undefined
 */
function readBook(wd, index, cb){
	readPages(wd, [index], [], (err, res) => {
		if (err) return cb(err)
		if (!res.length) return cb(`not found: ${index}`)
		if (!Array.isArray(res[0])) return cb(null, res)
		readPages(wd, res[0], [], cb)
	})
}

module.exports = {
	open(bname, cb){
		const bpath = getPath('.', bname)
		const wd = path.dirname(bpath)
		const name = path.basename(bpath)
		readBook(wd, name, (err, book) => {
			if (err) return cb(err)
			cb(null, pObj.extends({}, book, {flat: 1}))
		})
	},
	getPD
}
