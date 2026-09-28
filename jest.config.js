process.env.ALERT_TOPIC ??= 'test-alert-topic'

export default {
	projects: [
		{
			displayName: 'unit',
			testMatch: ['**/?(*.)test.?([mc])[jt]s?(x)'],
			testPathIgnorePatterns: ['cdk\\.out']
		},
		{
			displayName: 'cdk',
			testMatch: ['**/?(*.)cdktest.?([mc])[jt]s?(x)'],
			testPathIgnorePatterns: ['cdk\\.out']
		}
	]
}
