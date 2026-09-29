import {describe, expect, it, jest} from '@jest/globals'

import {FileContent} from '../src/extractors/file-content.js'

jest.unstable_mockModule('../src/config.js', () => ({
	config: {
		inputs: {
			school1: {
				extractors: ['json-only']
			}
		},
		extractors: {
			'json-only': {
				type: 'jsonpath',
				expression: '$.items[0].name'
			}
		}
	}
}))
const {runAllExtractors} = await import('../src/extractor-orchestrator.js')

describe('jsonpath extractor', () => {
	it('happy path', async () => {
		const data = {items: [{name: 'Alice'}]}
		const result = await runAllExtractors('school1', FileContent.toJsonStringContent(data))
		expect(result.asString()).toBe('"Alice"')
	})

	it('multiple matches returns just the first', async () => {
		const data = {items: [{name: 'Bob'}, {name: 'Alice'}]}
		const result = await runAllExtractors('school1', FileContent.toJsonStringContent(data))
		expect(result.asString()).toBe('"Bob"')
	})

	it('no match', async () => {
		const data = {items: [{notname: 'Alice'}]}
		await expect(runAllExtractors('school1', FileContent.toJsonStringContent(data))).rejects.toThrow('No match found')
	})
})
