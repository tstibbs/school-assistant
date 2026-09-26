export async function downloadFromUrl(extractorConfig, urlString) {
	const url = urlString.trim()
	console.log(`Downloading file from URL: ${url}`)

	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to download file: HTTP ${response.status} ${response.statusText}`)
	}

	const buffer = await response.arrayBuffer()
	const byteArray = new Uint8Array(buffer)

	console.log(`Successfully downloaded ${byteArray.length} bytes`)
	return byteArray
}
