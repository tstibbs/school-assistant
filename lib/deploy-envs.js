import dotenv from 'dotenv'

dotenv.config()
export const {
	STACK_NAME,
	AMZN_SKILL_ID,
	ALEXA_VENDOR_ID,
	ALEXA_CLIENT_ID,
	ALEXA_CLIENT_SECRET,
	ALEXA_REFRESH_TOKEN,
	NOTIFICATION_EMAIL
} = process.env

export const BANNED_REGIONS = process.env.BANNED_REGIONS.split(',')
