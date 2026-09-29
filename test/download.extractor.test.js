import {describe, expect, it, jest} from '@jest/globals'

jest.unstable_mockModule('../src/config.js', () => ({
	config: {
		inputs: {
			school1: {
				extraction: {extractorId: 'downloader'}
			}
		},
		extractors: {
			downloader: {
				type: 'download'
			}
		}
	}
}))
const {runAllExtractors} = await import('../src/extractor-orchestrator.js')

describe('file download extractor', () => {
	it('happy path', async () => {
		const data = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png'
		const response = await runAllExtractors('school1', data)
		expect(response).toBeInstanceOf(Uint8Array)
		expect(response.length).toBeGreaterThan(1000)
		//check for png header
		expect(Buffer.from(response).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
	})
	it('url not found', async () => {
		const data = 'https://example.com/invalid'
		await expect(runAllExtractors('school1', data)).rejects.toThrow('Failed to download file: HTTP 404 Not Found')
	})
})
