import {describe, expect, it, jest} from '@jest/globals'

jest.unstable_mockModule('../src/config.js', () => ({
	config: {
		inputs: {
			school1: {
				extraction: {extractorId: 'json-only'}
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
		await expect(runAllExtractors('school1', data)).resolves.toBe('Alice')
	})

	it('multiple matches returns just the first', async () => {
		const data = {items: [{name: 'Bob'}, {name: 'Alice'}]}
		await expect(runAllExtractors('school1', data)).resolves.toBe('Bob')
	})

	it('no match', async () => {
		const data = {items: [{notname: 'Alice'}]}
		await expect(runAllExtractors('school1', data)).rejects.toThrow('No match found')
	})
})
