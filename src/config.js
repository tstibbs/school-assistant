import {readFileSync} from 'node:fs'
import {load} from 'js-yaml'
import {merge} from 'lodash-es'
import {z} from 'zod'

const llmExtractorSchema = z.object({
	type: z.literal('llm'),
	modelId: z.string(),
	text: z.string()
})
const jsonpathExtractorSchema = z.object({
	type: z.literal('jsonpath'),
	expression: z.string()
})

const extractorSchema = z.union([llmExtractorSchema, jsonpathExtractorSchema])

const configSchema = z.object({
	inputs: z
		.record(
			z.string(),
			z.object({
				extraction: z.object({
					extractorId: z.string()
				}),
				aliases: z.array(z.string()).optional()
			})
		)
		.refine(obj => Object.keys(obj).length > 0, 'inputs cannot be empty'),
	extractors: z.record(z.string(), extractorSchema),
	query: z
		.object({
			modelId: z.string(),
			text: z.string()
		})
		.optional(),
	config: z.record(z.any()).optional()
})

function loadConfig() {
	const defaults = readFileSync('config-defaults.yaml', 'utf8')
	const customs = readFileSync('config.yaml', 'utf8')
	const defaultConfig = load(defaults)
	const customConfig = load(customs)

	const config = merge({}, defaultConfig, customConfig)
	validateConfig(config)
	return config
}

export function validateConfig(config) {
	// Validate schema structure
	const result = configSchema.safeParse(config)
	if (!result.success) {
		const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
		throw new Error(`Config validation failed: ${errors}`)
	}

	// Validate input names format (must match regex in cloudfront-auth.js)
	const nonMatches = Object.keys(config.inputs).filter(input => !/^[\w-_]+$/.test(input))
	if (nonMatches.length > 0) {
		throw new Error(`The following input names are in an invalid format: ${nonMatches.join(', ')}`)
	}

	// Validate all referenced extractorId are defined
	const undefinedPrompts = Object.values(config.inputs)
		.map(input => input.extraction.extractorId)
		.filter(extractorId => !(extractorId in config.extractors))
	if (undefinedPrompts.length > 0) {
		throw new Error(`The following promptIds were referenced but not defined: ${undefinedPrompts.join(', ')}`)
	}
}

export const config = loadConfig()
export const INPUTS = config.inputs
export const QUERY_CONFIG = config.query
export const PROMPTS = config.extractors
export const CONFIG = config.config
