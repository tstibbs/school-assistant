import {validateCdkAssets} from '@tstibbs/cloud-core-utils'
import {buildStack} from '../lib/deploy-utils.js'

process.env.ALERTS_TOPIC = 'dummy'

test('Assets are built as expected', async () => {
	//4 assets:
	//cloudfront auth function (CJS)
	//doc-extractor handler (ESM)
	//alexa-skill handler (CJS)
	//CustomS3AutoDeleteObjects (CJS)
	await validateCdkAssets(buildStack, 4)
}, 30000)
