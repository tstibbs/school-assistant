import {jest} from '@jest/globals'

const mockGetDatesByIds = jest.fn()
const mockGetEventsByDate = jest.fn()

jest.unstable_mockModule('../src/database/reader.js', () => ({
	Reader: jest.fn().mockImplementation(() => ({
		getDatesByIds: mockGetDatesByIds,
		getEventsByDate: mockGetEventsByDate
	}))
}))

const unmockedConfig = await import('../src/config.js')
const defaultMockInputs = {
	abc: {},
	def: {}
}
let mockInputs = {}

jest.unstable_mockModule('../src/config.js', () => ({
	...unmockedConfig,
	INPUTS: mockInputs
}))

async function importQueryServiceWithInputs(inputs) {
	mockInputs = {...inputs}
	jest.resetModules()
	const {QueryService} = await import('../src/queryService.js')
	return QueryService
}

describe('QueryService', () => {
	let QueryService
	let service

	beforeEach(async () => {
		jest.clearAllMocks()
		QueryService = await importQueryServiceWithInputs(defaultMockInputs)
		service = new QueryService()
	})
	describe('handleEventIds', () => {
		test('should return "No events" message for an empty ID list', () => {
			const result = service.handleEventIds([])
			expect(result).toBe('No events matching that description')
		})

		test('should correctly format a mix of single dates and ranges', () => {
			const mockData = [
				{
					inputId: 'Kitchen',
					description: 'Cooking Class',
					startDate: '2023-11-21',
					endDate: '2023-11-21' // Single
				},
				{
					inputId: 'Garden',
					description: 'Planting',
					startDate: '2023-11-22',
					endDate: '2023-11-25' // Range
				}
			]

			mockGetDatesByIds.mockReturnValue(mockData)

			const result = service.handleEventIds(['id_1', 'id_2'])

			// Check for specific formatting output
			expect(result).toContain('Cooking Class 21st of November at Kitchen')
			expect(result).toContain('Planting on starting 22nd of November at Garden')
		})

		test('should group multiple occurrences of the same event', () => {
			const mockData = [
				{
					inputId: 'Tech Hub',
					description: 'Coding',
					startDate: '2023-12-11',
					endDate: '2023-12-11'
				},
				{
					inputId: 'Tech Hub',
					description: 'Coding',
					startDate: '2023-12-13',
					endDate: '2023-12-13'
				}
			]

			mockGetDatesByIds.mockReturnValue(mockData)

			const result = service.handleEventIds(['id_3', 'id_4'])

			// Expect: "Description Date1, Date2 at Location"
			// Note: 11th, 12th, and 13th use 'th' suffix in your logic
			expect(result).toBe('Coding 11th of December, 13th of December at Tech Hub')
		})

		test(`should include input id if config has multi inputs even if response doesn't`, async () => {
			const mockData = [
				{
					inputId: 'Kitchen',
					description: 'Cooking Class',
					startDate: '2023-11-21',
					endDate: '2023-11-21' // Single
				},
				{
					inputId: 'Garden',
					description: 'Planting',
					startDate: '2023-11-22',
					endDate: '2023-11-25' // Range
				}
			]

			mockGetDatesByIds.mockReturnValue(mockData)

			const result = service.handleEventIds(['id_1', 'id_2'])

			// Check for specific formatting output
			expect(result).toContain('Cooking Class 21st of November at Kitchen')
			expect(result).toContain('Planting on starting 22nd of November at Garden')
		})

		test('should ignore input id if config only has a single input', async () => {
			const ServiceWithSingleInput = await importQueryServiceWithInputs({
				School1: {}
			})
			const singleInputService = new ServiceWithSingleInput()

			const mockData = [
				{
					inputId: 'School1',
					description: 'Cooking Class',
					startDate: '2023-11-21',
					endDate: '2023-11-21' // Single
				},
				{
					inputId: 'School1',
					description: 'Planting',
					startDate: '2023-11-22',
					endDate: '2023-11-25' // Range
				}
			]

			mockGetDatesByIds.mockReturnValue(mockData)

			const result = singleInputService.handleEventIds(['id_1', 'id_2'])

			// Check for specific formatting output
			expect(result).toBe('Cooking Class 21st of November. Planting on starting 22nd of November')
		})
	})

	describe('dateQuery', () => {
		test('should return a helpful message when no events exist on a date', async () => {
			mockGetEventsByDate.mockReturnValue([])

			await expect(service.dateQuery('2023-11-21')).resolves.toBe("I can't find any events on 21st of November")
		})

		test('should list descriptions for a single input without adding the input name', async () => {
			mockGetEventsByDate.mockReturnValue([
				{inputId: 'School1', description: 'Cooking Class'},
				{inputId: 'School2', description: 'Planting'}
			])

			await expect(service.dateQuery('2023-11-22')).resolves.toBe('Cooking Class at School1. Planting at School2')
		})

		test('should ignore input id if config only has a single input', async () => {
			const SingleInputService = await importQueryServiceWithInputs({
				abc: {}
			})
			const singleService = new SingleInputService()
			mockGetEventsByDate.mockReturnValue([
				{inputId: 'School1', description: 'Cooking Class'},
				{inputId: 'School1', description: 'Art Club'}
			])

			await expect(singleService.dateQuery('2023-11-22')).resolves.toBe('Cooking Class and Art Club')
		})

		test(`should include input id if config has multi inputs even if response doesn't`, async () => {
			mockGetEventsByDate.mockReturnValue([
				{inputId: 'School1', description: 'Cooking Class'},
				{inputId: 'School1', description: 'Art Club'}
			])

			await expect(service.dateQuery('2023-11-22')).resolves.toBe('Cooking Class and Art Club at School1')
		})

		test('should keep a single description without a conjunction', async () => {
			const SingleInputService = await importQueryServiceWithInputs({
				School1: {}
			})
			const singleService = new SingleInputService()
			mockGetEventsByDate.mockReturnValue([{inputId: 'School1', description: 'Cooking Class'}])

			await expect(singleService.dateQuery('2023-11-22')).resolves.toBe('Cooking Class')
		})
	})
})
