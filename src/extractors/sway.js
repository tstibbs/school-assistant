import chromium from '@sparticuz/chromium'
import {chromium as playwright} from 'playwright-core'

import {FileContent} from './file-content.js'

export async function fetchContent(extractorConfig, data) {
	const swayId = data.parseJson()
	const targetPageUrl = `https://sway.cloud.microsoft/${swayId}`
	console.log(targetPageUrl)
	let browser = null

	try {
		chromium.setGraphicsMode = false

		// Launch Chromium with essential memory-saving flags
		browser = await playwright.launch({
			args: [
				...chromium.args,
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage', // Memory fix: Use /tmp instead of restricted /dev/shm
				'--disable-gpu',
				'--single-process', // Memory fix: Prevent multiple renderer processes from spawning
				'--no-zygote',
				'--disable-accelerated-2d-canvas'
			],
			defaultViewport: chromium.defaultViewport,
			executablePath: await chromium.executablePath(),
			headless: true
		})

		const context = await browser.newContext({
			userAgent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
		})

		const page = await context.newPage()

		// Set default operation timeout to 30s so it doesn't hang until Lambda times out
		page.setDefaultTimeout(30000)

		// Block non-essential heavy resources (images, fonts, stylesheets, media) to keep memory low
		await page.route('**/*', route => {
			const resourceType = route.request().resourceType()
			if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
				return route.abort()
			}
			return route.continue()
		})

		// Set up network response listener with explicit 25s timeout
		const responsePromise = page.waitForResponse(
			response => response.url().includes(`/s/${swayId}/get`) && response.status() === 200,
			{timeout: 25000}
		)

		// Navigate to page
		await page.goto(targetPageUrl, {waitUntil: 'domcontentloaded', timeout: 25000})

		// Await API response
		const targetResponse = await responsePromise // don't collapse into the line below
		const data = await targetResponse.json()

		return FileContent.toJsonStringContent(data)
	} finally {
		if (browser) {
			await browser.close()
		}
	}
}
