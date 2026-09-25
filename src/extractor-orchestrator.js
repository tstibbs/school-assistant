import {buildErrorNotifyingLambdaHandler} from '@tstibbs/cloud-core-utils/src/utils/lambda.js'

import {INPUTS, PROMPTS} from './config.js'

const extractors = {
	llm: async () => (await import('./extractors/llm.js')).processOneObject
}

async function handleEvent(event) {
	const results = event.Records.map(async record => {
		const bucket = record.s3.bucket.name
		const key = decodeURIComponent(record.s3.object.key)

		try {
			await processOneObject(bucket, key)
			console.log(`Successfully processed ${key}`)
		} catch (err) {
			console.error(`Error processing ${key}:`, err)
			throw err
		}
	})
	await Promise.all(results)
}

async function processOneObject(bucket, key) {
	console.log(`Processing file: s3://${bucket}/${key}`)
	const keyParts = key.split('/')
	if (keyParts.length != 2) {
		throw new Error(`Invalid key: ${key}`)
	}
	if (keyParts[1] != 'input.pdf') {
		return
	}
	const inputId = keyParts[0]
	const input = INPUTS[inputId]
	const extractorConfigs = [input.extraction.extractorId].map(extractorId => PROMPTS[extractorId])
	for (const extractorConfig of extractorConfigs) {
		const extractor = await extractors[extractorConfig.type]()
		await extractor(inputId, bucket, key)
	}
}

export const handler = buildErrorNotifyingLambdaHandler('doc-extractor', handleEvent)
