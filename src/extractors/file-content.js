export class FileContent {
	#string = null
	#binary = null

	constructor(input, encoding = 'utf8') {
		this.encoding = encoding

		if (typeof input === 'string') {
			this.#string = input
		} else if (input instanceof Uint8Array) {
			this.#binary = input
		} else {
			throw new TypeError('Input must be a string or Uint8Array')
		}
	}

	static toJsonStringContent(data) {
		const jsonString = JSON.stringify(data)
		return new this(jsonString)
	}

	asBinary() {
		if (!this.#binary) {
			this.#binary = Buffer.from(this.#string, this.encoding)
		}
		return this.#binary
	}

	asString() {
		if (!this.#string) {
			// Convert to a temporary Buffer view on demand to decode into a string
			const buf = Buffer.from(this.#binary.buffer, this.#binary.byteOffset, this.#binary.byteLength)
			this.#string = buf.toString(this.encoding)
		}
		return this.#string
	}

	parseJson() {
		return JSON.parse(this.asString())
	}
}
