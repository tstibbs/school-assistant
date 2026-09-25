import {describe, it, expect} from '@jest/globals'
import {validateConfig} from '../src/config.js'

describe('Config validation', () => {
	const validConfig = {
		inputs: {
			school1: {
				extraction: {extractorId: 'newsletter'},
				aliases: ['alias1']
			}
		},
		extractors: {
			newsletter: {
				type: 'llm',
				modelId: 'eu.anthropic.claude-sonnet-4-6',
				text: 'Extract events from file'
			}
		}
	}

	it('accepts valid config', () => {
		expect(() => validateConfig(validConfig)).not.toThrow()
	})

	it('rejects empty inputs', () => {
		const config = {...validConfig, inputs: {}}
		expect(() => validateConfig(config)).toThrow('inputs cannot be empty')
	})

	it('rejects missing extractors object', () => {
		const config = {...validConfig, extractors: undefined}
		expect(() => validateConfig(config)).toThrow('Config validation failed')
	})

	it('rejects prompt without modelId', () => {
		const config = {
			inputs: {school1: {extraction: {extractorId: 'newsletter'}}},
			extractors: {newsletter: {text: 'Extract events'}}
		}
		expect(() => validateConfig(config)).toThrow('Config validation failed')
	})

	it('rejects prompt without text', () => {
		const config = {
			inputs: {school1: {extraction: {extractorId: 'newsletter'}}},
			extractors: {newsletter: {type: 'llm', modelId: 'claude-sonnet-4-6'}}
		}
		expect(() => validateConfig(config)).toThrow('Config validation failed')
	})

	it('rejects undefined extractorId reference', () => {
		const config = {
			inputs: {school1: {extraction: {extractorId: 'nonexistent'}}},
			extractors: {newsletter: {type: 'llm', modelId: 'claude', text: 'text'}}
		}
		expect(() => validateConfig(config)).toThrow('The following promptIds were referenced but not defined: nonexistent')
	})

	it('rejects invalid input names', () => {
		const config = {
			inputs: {
				'invalid@name': {extraction: {extractorId: 'newsletter'}}
			},
			extractors: {newsletter: {type: 'llm', modelId: 'claude', text: 'text'}}
		}
		expect(() => validateConfig(config)).toThrow('invalid format')
	})

	it('accepts valid input names with underscores and hyphens', () => {
		const config = {
			inputs: {
				school_1: {extraction: {extractorId: 'newsletter'}},
				'school-2': {extraction: {extractorId: 'newsletter'}}
			},
			extractors: {newsletter: {type: 'llm', modelId: 'claude', text: 'text'}}
		}
		expect(() => validateConfig(config)).not.toThrow()
	})

	it('accepts optional aliases', () => {
		const config = {
			inputs: {
				school1: {
					extraction: {extractorId: 'newsletter'},
					aliases: ['alias1', 'alias2']
				}
			},
			extractors: {newsletter: {type: 'llm', modelId: 'claude', text: 'text'}}
		}
		expect(() => validateConfig(config)).not.toThrow()
	})
})
