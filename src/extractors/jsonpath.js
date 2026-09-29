import {JSONPath} from 'jsonpath-plus'

import {FileContent} from './file-content.js'

export function findJsonPath(extractorConfig, data) {
	const jsonData = data.parseJson()
	const {expression} = extractorConfig
	const matches = JSONPath({
		path: expression,
		json: jsonData
	})
	console.log(matches)
	if (matches.length == 0) {
		throw new Error('No match found')
	}
	if (matches.length > 1) {
		console.warn(`${matches.length} matches found; returning only the first match`)
	}
	return FileContent.toJsonStringContent(matches[0])
}
