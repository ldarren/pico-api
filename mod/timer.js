const pTime = require('pico-common').export('pico/time')

/**
 * Timeout function
 *
 * @param {object} host - host object
 * @param {string} path - pipeline name
 * @param {Array} parsed - parsed timer
 * @returns {object} - timer handler
 */
function timeout(host, path, parsed){
	host.go(path)
	return setTimeout(timeout, pTime.nearest(...parsed, Date.now()) - Date.now(), host, path, parsed)
}

module.exports = {
	setup(cfg, rsc, paths){
		const now = Date.now()
		return paths.forEach(p => {
			const parsed = pTime.parse(p)
			if (!parsed) return
			setTimeout(timeout, pTime.nearest(...parsed, now) - now, this, p, parsed)
		})
	}
}
