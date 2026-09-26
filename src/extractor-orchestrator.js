import {createHash} from 'node:crypto'

import {S3Client, GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3'
import {buildErrorNotifyingLambdaHandler} from '@tstibbs/cloud-core-utils/src/utils/lambda.js'

import {updateAllData} from './database/writer.js'
import {CONFIG, INPUTS, PROMPTS} from './config.js'

const extractors = {
	llm: async () => (await import('./extractors/llm.js')).processOneObject
}

const s3Client = new S3Client()

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

	const response = await s3Client.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key
		})
	)
	const fileBody = await response.Body.transformToByteArray()

	// Calculate hash of incoming file
	const incomingHash = createHash('md5').update(fileBody).digest('hex')
	const hashKey = `${inputId}/input.pdf.hash`

	// Check if hash has changed
	const hasChanged = await hashHasChanged(bucket, hashKey, incomingHash)

	if (!hasChanged) {
		console.log(`File hash unchanged for ${inputId}, skipping extraction`)
		return
	}

	console.log(`File hash changed for ${inputId}, proceeding with extraction`)

	const input = INPUTS[inputId]
	const extractorConfigs = [input.extraction.extractorId].map(extractorId => PROMPTS[extractorId])
	let lastOutput = fileBody
	for (const extractorConfig of extractorConfigs) {
		const extractor = await extractors[extractorConfig.type]()
		lastOutput = await extractor(inputId, lastOutput)
	}

	//write this input's data
	await s3Client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: `${inputId}/data.json`,
			Body: JSON.stringify(lastOutput),
			ContentType: 'application/json'
		})
	)

	//now update all data
	await updateAllData(bucket)

	// Store the hash for future comparisons, only if everything completed successfully
	await s3Client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: hashKey,
			Body: incomingHash,
			ContentType: 'text/plain'
		})
	)
}

async function hashHasChanged(bucket, hashKey, incomingHash) {
	try {
		const response = await s3Client.send(
			new GetObjectCommand({
				Bucket: bucket,
				Key: hashKey
			})
		)
		const storedHash = await response.Body.transformToString()

		if (incomingHash === storedHash) {
			console.log(`Hash unchanged: ${incomingHash} == ${storedHash}`)
			return false
		} else {
			console.log(`Hash changed: ${incomingHash} !== ${storedHash}`)
			return true
		}
	} catch (err) {
		if (err.name === 'NoSuchKey') {
			console.log(`No stored hash found for ${hashKey}, treating as changed`)
			return true
		} else {
			throw err
		}
	}
}

export const handler = buildErrorNotifyingLambdaHandler('doc-extractor', handleEvent)
