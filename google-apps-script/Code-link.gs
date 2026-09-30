const POST_URL = 'TODO' // take the value of `uploadEndpoint` from the cloudformation stack outputs
const BASE_searchQuery = 'newer_than:2h'
const UPLOAD_AUTH_PASSWORD = 'TODO' // should match the value of 'UPLOAD_AUTH_PASSWORD' in .env

const CONFIGS = [
	{
		//edit these values as necessary
		searchQuery: `${BASE_searchQuery} from:(office@school.name.com)`,
		emailSubjectRegex: /Newsletter.*/i,
		inputId: 'school1' // must match the 'inputId' in config.yaml
	}
	//repeat config block for each 'input' listed in config.yaml
]

function processEmailsToApi() {
	// Regex to match '/sway/v1.0/{id}/thumbnailImage' and capture the ID
	const swayIdRegex = /\/sway\/v1\.0\/([a-zA-Z0-9]+)\/thumbnailImage/i

	CONFIGS.forEach(config => {
		Logger.log(config.inputId)
		const threads = GmailApp.search(config.searchQuery)
		threads.forEach(thread => {
			const messages = thread.getMessages()
			messages.forEach(message => {
				const subject = message.getSubject()
				Logger.log(subject)
				if (config.emailSubjectRegex.test(subject)) {
					// Get raw source content to ensure hidden URLs and HTML are searchable
					const bodyContent = message.getRawContent()
					const match = bodyContent.match(swayIdRegex)

					if (match && match[1]) {
						const swayId = match[1]
						Logger.log(`Found Sway ID: ${swayId}`)
						postToEndpoint(config, swayId)
					} else {
						Logger.log('No Sway ID found in this email.')
					}
				}
			})
		})
	})
}

function postToEndpoint(config, swayId) {
	const url = `${POST_URL}${config.inputId}/input.pdf`
	const payload = JSON.stringify(swayId)
	const options = {
		method: 'put',
		contentType: 'application/json',
		payload: payload,
		followRedirects: true,
		muteHttpExceptions: true,
		headers: {
			'x-auth-password': UPLOAD_AUTH_PASSWORD
		}
	}

	try {
		const response = UrlFetchApp.fetch(url, options)
		Logger.log(`Response body: ${response.getContentText()}`)
		Logger.log(`Sent Sway ID: ${swayId} | Status: ${response.getResponseCode()}`)
	} catch (e) {
		Logger.log(`Error sending Sway ID ${swayId}: ${e.toString()}`)
	}
}

function createHourlyTrigger() {
	// Check if trigger already exists to avoid duplicates
	const triggers = ScriptApp.getProjectTriggers()
	for (let i = 0; i < triggers.length; i++) {
		if (triggers[i].getHandlerFunction() === 'processEmailsToApi') return
	}

	ScriptApp.newTrigger('processEmailsToApi').timeBased().everyHours(1).create()
}
