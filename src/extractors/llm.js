import {extractEventsFromPdf as aiPdfExtract, extractEventsFromText as aiTextExtract} from '../integration/bedrock.js'
import {translateData} from '../database/translate.js'
import {extractText as dumbPdfExtract, countPages} from '../formats/pdf.js'
import {CONFIG} from '../config.js'

export async function processOneObject(inputId, fileBody) {
	const pageCount = await countPages(fileBody)
	let output
	if (pageCount > CONFIG.pageLimitForAi) {
		// pages cost around $0.01 per page in claude sonnet, so cost can add up quickly
		console.log(`High page count (${pageCount}), so falling back to local text extract followed by AI text parsing`)
		const pageText = await dumbPdfExtract(fileBody)
		output = await aiTextExtract(inputId, pageText)
	} else {
		console.log(`Low page count (${pageCount}), using full AI pdf parsing`)
		output = await aiPdfExtract(inputId, fileBody)
	}
	const data = translateData(output)

	console.log(output)
	console.log(JSON.stringify(data))
	return data
}
