import {checkAllStackPolicies} from '@tstibbs/cloud-core-utils'
import {buildStack} from '../lib/deploy-utils.js'

const stack = buildStack()
describe('Stack meets our policies', () => {
	checkAllStackPolicies(stack)
})
