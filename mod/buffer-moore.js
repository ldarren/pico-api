// ref: https://gist.github.com/jhermsmeier/2138865
module.exports = {

	alphabetSize: 256,

	/*
	 *Returns the index of the first occurence of
	 *the `needle` buffer within the `haystack` buffer.
	 *
	 *@param {Buffer} needle
	 *@param {Buffer} haystack
	 *@return {Integer}
	 */
	indexOf(needle, haystack, charTable, offsetTable) {

		const n = needle.length
		const m = haystack.length

		if(n === 0) return n

		charTable = charTable || this.makeCharTable(needle)
		offsetTable = offsetTable || this.makeOffsetTable(needle)

		let k
		for(let i = n - 1; i < m;) {
			for(k = n - 1; needle[k] === haystack[i]; --i, --k) {
				if(k === 0) return i
			}
			// i += n - k; // for naive method
			i += Math.max(offsetTable[n - 1 - k], charTable[haystack[i]])
		}

		return -1
	},

	/*
	 *Makes the jump table based on the
	 *mismatched character information.
	 *
	 *@param {Buffer} needle
	 *@return {Buffer}
	 */
	makeCharTable(needle) {

		const table = new Uint32Array(this.alphabetSize)
		let n = needle.length
		const t = table.length
		let i = 0

		for(; i < t; ++i) {
			table[i] = n
		}

		n--

		for(i = 0; i < n; ++i) {
			table[needle[i]] = n - i
		}

		return table
	},

	/*
	 *Makes the jump table based on the
	 *scan offset which mismatch occurs.
	 *
	 *@param {Buffer} needle
	 */
	makeOffsetTable(needle) {

		let i, suffix
		const n = needle.length
		const m = n - 1
		let lastPrefix = n
		const table = new Uint32Array(n)

		for (i = m; i >= 0; --i) {
			if (this.isPrefix(needle, i + 1)) {
				lastPrefix = i + 1
			}
			table[m - i] = lastPrefix - i + m
		}

		for(i = 0; i < n; ++i) {
			suffix = this.suffixLength(needle, i)
			table[suffix] = m - i + suffix
		}

		return table
	},

	/*
	 *Is `needle[i:end]` a prefix of `needle`?
	 *
	 *@param {Buffer} needle
	 *@param {Integer} i
	 */
	isPrefix(needle, i) {

		for(let k = 0, n = needle.length; i < n; ++i, ++k) {
			if (needle[i] !== needle[k]) {
				return false
			}
		}

		return true
	},

	/*
	 * Returns the maximum length of the
	 * substring ends at `i` and is a suffix.
	 *
	 * @param {Buffer} needle - the string to find
	 * @param {Integer} i - suffix
	 * @returns {Integer} - suffix length
	 */
	suffixLength(needle, i) {
		let k = 0
		const n = needle.length

		for(let m = n - 1; i >= 0 && needle[i] === needle[m]; --i, --m) {
			k += 1
		}

		return k
	}
}
