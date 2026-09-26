import {JSONPath} from 'jsonpath-plus'

export function findJsonPath(extractorConfig, data) {
	const {expression} = extractorConfig
	const matches = JSONPath({
		path: expression,
		json: data
	})
	console.log(matches)
	if (matches.length == 0) {
		throw new Error('No match found')
	}
	if (matches.length > 1) {
		console.warn(`${matches.length} matches found; returning only the first match`)
	}
	return matches[0]
}
