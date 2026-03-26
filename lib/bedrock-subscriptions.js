import {Construct} from 'constructs'
import {PolicyStatement} from 'aws-cdk-lib/aws-iam'
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from 'aws-cdk-lib/custom-resources'
import {Stack} from 'aws-cdk-lib'
import {BANNED_REGIONS} from './deploy-envs.js'

export class BedrockModelEnabler extends Construct {
	constructor(scope, id, {modelIds}) {
		super(scope, id)

		modelIds.forEach(modelId => {
			const sanitizedId = modelId.replace(/[:.]/g, '-')

			// 1. Fetch Offer Token
			const listOffers = new AwsCustomResource(this, `ListOffers-${sanitizedId}`, {
				onCreate: {
					service: 'Bedrock',
					action: 'listFoundationModelAgreementOffers',
					parameters: {
						modelId,
						offerType: 'PUBLIC'
					},
					physicalResourceId: PhysicalResourceId.of(`offers-${modelId}`),
					outputPaths: ['offers.0.offerToken']
				},
				installLatestAwsSdk: true,
				policy: AwsCustomResourcePolicy.fromStatements([
					new PolicyStatement({
						actions: ['bedrock:ListFoundationModelAgreementOffers'],
						resources: ['*']
					})
				])
			})

			// 2. Create Agreement (The actual marketplace "handshake")
			const subscription = new AwsCustomResource(this, `Sub-${sanitizedId}`, {
				onCreate: {
					service: 'Bedrock',
					action: 'createFoundationModelAgreement',
					parameters: {
						modelId,
						offerToken: listOffers.getResponseField('offers.0.offerToken')
					},
					physicalResourceId: PhysicalResourceId.of(`agreement-${modelId}`),
					// Vital for idempotency
					ignoreErrorCodes: 'ConflictException'
				},
				installLatestAwsSdk: true,
				policy: AwsCustomResourcePolicy.fromStatements([
					new PolicyStatement({
						actions: [
							'bedrock:CreateFoundationModelAgreement',
							'aws-marketplace:Subscribe',
							'aws-marketplace:ViewSubscriptions'
						],
						resources: ['*']
					})
				])
			})

			subscription.node.addDependency(listOffers)
		})
	}

	grantAccessToModels(grantable, modelIds) {
		modelIds.forEach(modelId => {
			const inferenceProfileRegex = /^\w\w\..+/
			if (inferenceProfileRegex.test(modelId)) {
				// if it is an inference profile you have to grant access to the profile, and also the underlying
				// models. But because you don't know the arn of the models, you have to be quite permissive. We
				// use the `bedrock:InferenceProfileArn` condition key to ensure that our permissive permissions
				// cannot be abused
				const profileArn = Stack.of(this).formatArn({
					service: 'bedrock',
					resource: 'inference-profile',
					resourceName: modelId
				})
				grantable.grantPrincipal.addToPrincipalPolicy(
					new PolicyStatement({
						resources: [profileArn],
						actions: ['bedrock:InvokeModel']
					})
				)
				grantable.grantPrincipal.addToPrincipalPolicy(
					new PolicyStatement({
						resources: ['arn:aws:bedrock:*:*:foundation-model/*'],
						actions: ['bedrock:InvokeModel'],
						conditions: {
							ArnEquals: {
								'bedrock:InferenceProfileArn': profileArn
							},
							StringNotLike: {
								'aws:RequestedRegion': BANNED_REGIONS
							}
						}
					})
				)
			} else {
				grantable.grantPrincipal.addToPrincipalPolicy(
					new PolicyStatement({
						resources: [
							Stack.of(this).formatArn({
								service: 'bedrock',
								account: '', // Foundation models are resource-level, no account ID
								resource: 'foundation-model',
								resourceName: modelId
							})
						],
						actions: ['bedrock:InvokeModel']
					})
				)
			}
		})
	}
}
