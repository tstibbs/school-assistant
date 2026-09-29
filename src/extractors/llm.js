import {extractEventsFromPdf as aiPdfExtract, extractEventsFromText as aiTextExtract} from '../integration/bedrock.js'
import {translateData} from '../database/translate.js'
import {extractText as dumbPdfExtract, countPages} from '../formats/pdf.js'
import {config} from '../config.js'
import {FileContent} from './file-content.js'

export async function processOneObject(extractorConfig, inputData) {
	const fileBody = inputData.asBinary()
	const pageCount = await countPages(fileBody)
	let output
	if (pageCount > config.global.pageLimitForAi) {
		// pages cost around $0.01 per page in claude sonnet, so cost can add up quickly
		console.log(`High page count (${pageCount}), so falling back to local text extract followed by AI text parsing`)
		const pageText = await dumbPdfExtract(fileBody)
		output = await aiTextExtract(extractorConfig, pageText)
	} else {
		console.log(`Low page count (${pageCount}), using full AI pdf parsing`)
		output = await aiPdfExtract(extractorConfig, fileBody)
	}
	const data = translateData(output)

	console.log(output)
	return FileContent.toJsonStringContent(data)
}
