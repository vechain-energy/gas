// Mock setup must be at the top level
const getNodeMock = jest.fn()
const postNodeMock = jest.fn()
const bentMock = jest.fn().mockImplementation((url: string, method: string) => {
    if (method === 'GET') {
        return getNodeMock
    }
    return postNodeMock
})
jest.mock('bent', () => bentMock, { virtual: true })

import estimate from './index'

describe('estimate(clause[]) with dynamic fee market', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('calculates correctly with dynamic fees using base fee + priority fee', async () => {
        // Mock base fee: 10 gwei
        getNodeMock.mockResolvedValueOnce({
            baseFeePerGas: '0x2540be400' // 10 gwei in hex
        })
        // Mock priority fee: 1 gwei
        getNodeMock.mockResolvedValueOnce({
            maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei in hex
        })
        // Mock VM gas response
        postNodeMock.mockResolvedValueOnce([
            {
                data: '0x000000000000000000000000000000000000000000000000000009184e72a000',
                events: [],
                transfers: [],
                gasUsed: 591,
                reverted: false,
                vmError: ''
            }
        ])
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ])
        // Intrinsic gas: 21046, VM gas: 591, Total: 21637
        // Fee per gas: 10 + 0.46 = 10.46 gwei = 10460000000 wei (4.6% rule)
        // Gas cost: 21637 * 10460000000 / 1e13 = 38
        expect(gas).toEqual(38)
    })

    it('uses custom priority fee when provided', async () => {
        getNodeMock.mockResolvedValueOnce({ baseFeePerGas: '0x2540be400' })
        postNodeMock.mockResolvedValueOnce([
            {
                data: '0x000000000000000000000000000000000000000000000000000009184e72a000',
                events: [],
                transfers: [],
                gasUsed: 591,
                reverted: false,
                vmError: ''
            }
        ])
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ], {
            maxPriorityFeePerGas: '2000000000' // 2 gwei
        })
        // Intrinsic gas: 21046, VM gas: 591, Total: 21637
        // Fee per gas: 10 + 2 = 12 gwei = 12000000000 wei
        // Gas cost: 21637 * 12000000000 / 1e13 = 44
        expect(gas).toEqual(44)
    })

    it('applies maxFeePerGas cap when provided', async () => {
        getNodeMock.mockResolvedValueOnce({ baseFeePerGas: '0x2540be400' })
        getNodeMock.mockResolvedValueOnce({ maxPriorityFeePerGas: '0x3b9aca00' })
        postNodeMock.mockResolvedValueOnce([
            {
                data: '0x000000000000000000000000000000000000000000000000000009184e72a000',
                events: [],
                transfers: [],
                gasUsed: 591,
                reverted: false,
                vmError: ''
            }
        ])
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ], {
            maxFeePerGas: '8000000000' // 8 gwei cap
        })
        // Intrinsic gas: 21046, VM gas: 591, Total: 21637
        // Fee per gas: min(10 + 0.46, 8) = 8 gwei = 8000000000 wei
        // Gas cost: 21637 * 8000000000 / 1e13 = 29
        expect(gas).toEqual(29)
    })

    it('falls back to legacy calculation when baseFeePerGas not available', async () => {
        getNodeMock.mockResolvedValueOnce({})
        postNodeMock.mockResolvedValueOnce([
            {
                data: '0x000000000000000000000000000000000000000000000000000009184e72a000',
                events: [],
                transfers: [],
                gasUsed: 591,
                reverted: false,
                vmError: ''
            }
        ])
        getNodeMock.mockResolvedValueOnce({ maxPriorityFeePerGas: '0x3b9aca00' })
        postNodeMock.mockResolvedValueOnce([
            {
                data: '0x000000000000000000000000000000000000000000000000000009184e72a000',
                events: [],
                transfers: [],
                gasUsed: 591,
                reverted: false,
                vmError: ''
            }
        ])
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ])
        // Legacy base price: 10000000000000 (10 gwei)
        // Priority fee: 1000000000 (1 gwei)
        // Total fee: 10001000000000
        // Gas cost: 21637 * 10001000000000 / 1e13 = 21637
        expect(gas).toEqual(36595)
    })

    it('calculates optimal priority fee using fee history', async () => {
        getNodeMock.mockResolvedValueOnce({ baseFeePerGas: '0xe8d4a51000' })
        getNodeMock.mockResolvedValueOnce({
            oldestBlock: '0x1',
            baseFeePerGas: ['0x1', '0x2', '0x3'],
            gasUsedRatio: ['0.5', '0.6', '0.7'],
            reward: [
                ['0x20', '0x20', '0x20']
            ]
        })
        postNodeMock.mockResolvedValueOnce([
            {
                data: '0x000000000000000000000000000000000000000000000000000009184e72a000',
                events: [],
                transfers: [],
                gasUsed: 591,
                reverted: false,
                vmError: ''
            }
        ])
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ])
        // Intrinsic gas: 21046, VM gas: 591, Total: 21637
        // Fee per gas: 1000 + 0.000000032 = 1000.000000032 gwei
        // Gas cost: 21637 * 1000000000032 / 1e13 = 3659
        expect(gas).toEqual(3659)
    })
})