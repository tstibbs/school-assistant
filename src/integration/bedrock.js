import {BedrockRuntimeClient, ConverseCommand} from '@aws-sdk/client-bedrock-runtime'

import {config} from '../config.js'

const MAX_TOKENS = 4000

const client = new BedrockRuntimeClient()

export async function extractEventsFromText(extractorConfig, fileText) {
	const {prompt, modelId} = extractorConfig
	const conversation = [
		{
			role: 'user',
			content: [
				{
					text: fileText
				},
				{
					text: prompt
				}
			]
		}
	]
	const outputText = await makeRequest(modelId, conversation)
	try {
		// check that it's valid json, but then return the string so it can be easily written back to S3
		JSON.parse(outputText)
		return outputText
	} catch (e) {
		console.error(e)
		console.error(`Response: '${outputText}'`)
		throw e
	}
}

export async function extractEventsFromPdf(extractorConfig, fileBody) {
	const {prompt, modelId} = extractorConfig
	const conversation = [
		{
			role: 'user',
			content: [
				{
					document: {
						name: 'target_document',
						format: 'pdf',
						source: {
							bytes: fileBody
						}
					}
				},
				{
					text: prompt
				}
			]
		}
	]
	const outputText = await makeRequest(modelId, conversation)
	try {
		// check that it's valid json, but then return the string so it can be easily written back to S3
		JSON.parse(outputText)
		return outputText
	} catch (e) {
		console.error(e)
		console.error(`Response: '${outputText}'`)
		throw e
	}
}

export async function query(prompt) {
	const conversation = [
		{
			role: 'user',
			content: [
				{
					text: prompt
				}
			]
		}
	]
	return await makeRequest(config.query.modelId, conversation)
}

async function makeRequest(modelId, conversation) {
	const command = new ConverseCommand({
		modelId: modelId,
		messages: conversation,
		inferenceConfig: {
			maxTokens: MAX_TOKENS
		}
	})

	const response = await client.send(command)
	console.log(
		`Token usage: input=${response?.usage?.inputTokens}, output=${response?.usage?.outputTokens}, total=${response?.usage?.totalTokens}`
	)
	const outputText = response.output.message.content[0].text
	return outputText
}
