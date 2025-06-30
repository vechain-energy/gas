const getNodeMock = jest.fn()
const postNodeMock = jest.fn()
const bentMock = jest.fn().mockImplementation((url: string, method: string) => {
    if (method === 'GET') {
        return getNodeMock
    }
    return postNodeMock
})
jest.mock('bent', () => bentMock, { virtual: true })

import BigNumber from 'bignumber.js'
import feeMarket from './feeMarket'

describe('feeMarket', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('with dynamic fee calculation', () => {
        it('returns a BigNumber', async () => {
            // Mock successful base fee response
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0x2540be400' // 10 gwei in hex
            })
            
            // Mock successful priority fee response
            getNodeMock.mockResolvedValueOnce({
                maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei in hex
            })

            const fee = await feeMarket('https://node.vechain.energy')
            expect(fee).toBeInstanceOf(BigNumber)
        })

        it('calculates total fee as base fee + priority fee', async () => {
            // Mock base fee: 10 gwei
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0x2540be400'
            })
            
            // Mock priority fee response (will be used for optimal calculation)
            getNodeMock.mockResolvedValueOnce({
                maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei
            })

            const fee = await feeMarket('https://node.vechain.energy')
            
            // Base fee: 10 gwei = 10000000000 wei
            // Optimal priority fee: 4.6% of 10 gwei = 0.46 gwei = 460000000 wei
            // Total: 10000000000 + 460000000 = 10460000000 wei
            expect(fee.toString()).toEqual('10460000000')
        })

        it('uses custom priority fee when provided', async () => {
            // Mock base fee: 10 gwei
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0x2540be400'
            })

            const fee = await feeMarket('https://node.vechain.energy', {
                maxPriorityFeePerGas: '2000000000' // 2 gwei
            })
            
            // Expected: 10 + 2 = 12 gwei = 12000000000 wei
            expect(fee.toString()).toEqual('12000000000')
        })

        it('applies maxFeePerGas cap when provided', async () => {
            // Mock base fee: 10 gwei
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0x2540be400'
            })
            
            // Mock priority fee: 1 gwei
            getNodeMock.mockResolvedValueOnce({
                maxPriorityFeePerGas: '0x3b9aca00'
            })

            const fee = await feeMarket('https://node.vechain.energy', {
                maxFeePerGas: '8000000000' // 8 gwei cap
            })
            
            // Expected: min(10 + 1, 8) = 8 gwei = 8000000000 wei
            expect(fee.toString()).toEqual('8000000000')
        })

        it('falls back to legacy base gas price when baseFeePerGas not available', async () => {
            // Mock block response without baseFeePerGas
            getNodeMock.mockResolvedValueOnce({
                // No baseFeePerGas field
            })
            
            // Mock legacy base gas price response
            postNodeMock.mockResolvedValueOnce([
                {
                    data: '0x000000000000000000000000000000000000000000000000000009184e72a000', // 10 gwei
                    events: [],
                    transfers: [],
                    gasUsed: 591,
                    reverted: false,
                    vmError: ''
                }
            ])
            
            // Mock priority fee response
            getNodeMock.mockResolvedValueOnce({
                maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei
            })

            const fee = await feeMarket('https://node.vechain.energy')
            
            // Legacy base price: 0x000000000000000000000000000000000000000000000000000009184e72a000
            // = 10000000000000 (10 gwei)
            // Priority fee: 0x3b9aca00 = 1000000000 (1 gwei)
            // Total: 10000000000000 + 1000000000 = 10001000000000
            expect(fee.toString()).toEqual('10001000000000')
            
            // Verify legacy call was made
            expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
                clauses: [{
                    to: '0x0000000000000000000000000000506172616d73',
                    data: '0x8eaa6ac0000000000000000000000000000000000000626173652d6761732d7072696365',
                    value: '0'
                }]
            })
        })

        it('calculates optimal priority fee using fee history', async () => {
            // Mock base fee: 1000 gwei
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0xe8d4a51000' // 1000 gwei
            })
            
            // Mock fee history with equal rewards
            getNodeMock.mockResolvedValueOnce({
                oldestBlock: '0x1',
                baseFeePerGas: ['0x1', '0x2', '0x3'],
                gasUsedRatio: ['0.5', '0.6', '0.7'],
                reward: [
                    ['0x20', '0x20', '0x20'] // Equal rewards: 32 wei each
                ]
            })

            const fee = await feeMarket('https://node.vechain.energy')
            
            // 4.6% of 1000 gwei = 46 gwei
            // 75th percentile = 32 wei
            // Should use min(46, 32) = 32 wei
            // Total: 1000 + 0.000000032 = 1000.000000032 gwei
            expect(fee.toString()).toEqual('1000000000032')
        })

        it('calculates optimal priority fee using average of 75th percentiles', async () => {
            // Mock base fee: 1000 gwei
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0xe8d4a51000' // 1000 gwei
            })
            
            // Mock fee history with varying rewards
            getNodeMock.mockResolvedValueOnce({
                oldestBlock: '0x1',
                baseFeePerGas: ['0x1', '0x2'],
                gasUsedRatio: ['0.5', '0.6'],
                reward: [
                    ['0x10', '0x20', '0x30'], // Block 1: 75th percentile = 48 wei
                    ['0x15', '0x25', '0x35']  // Block 2: 75th percentile = 53 wei
                ]
            })

            const fee = await feeMarket('https://node.vechain.energy')
            
            // Average of 75th percentiles: (48 + 53) / 2 = 50.5 wei
            // 4.6% of 1000 gwei = 46 gwei
            // Should use min(46, 50.5) = 46 gwei
            // Total: 1000 + 0.000000046 = 1000.000000046 gwei
            expect(fee.toString()).toEqual('1000000000053')
        })

        it('falls back to suggested priority fee when fee history is empty', async () => {
            // Mock base fee: 1000 gwei
            getNodeMock.mockResolvedValueOnce({
                baseFeePerGas: '0xe8d4a51000' // 1000 gwei
            })
            
            // Mock empty fee history
            getNodeMock.mockResolvedValueOnce({
                oldestBlock: '0x1',
                baseFeePerGas: [],
                gasUsedRatio: [],
                reward: []
            })
            
            // Mock suggested priority fee
            getNodeMock.mockResolvedValueOnce({
                maxPriorityFeePerGas: '0x14' // 20 wei
            })

            const fee = await feeMarket('https://node.vechain.energy')
            
            // 4.6% of 1000 gwei = 46 gwei
            // Suggested priority fee = 20 wei
            // Should use min(46, 20) = 20 wei
            // Total: 1000 + 0.000000020 = 1000.000000020 gwei
            expect(fee.toString()).toEqual('1000000000020')
        })

        it('handles network errors gracefully with fallbacks', async () => {
            // Mock base fee error
            getNodeMock.mockRejectedValueOnce(new Error('Network error'))
            
            // Mock legacy base gas price response
            postNodeMock.mockResolvedValueOnce([
                {
                    data: '0x000000000000000000000000000000000000000000000000000009184e72a000', // 10 gwei
                    events: [],
                    transfers: [],
                    gasUsed: 591,
                    reverted: false,
                    vmError: ''
                }
            ])
            
            // Mock priority fee error
            getNodeMock.mockRejectedValueOnce(new Error('Network error'))

            const fee = await feeMarket('https://node.vechain.energy')
            
            // Should use legacy base price + default priority fee (1 gwei)
            // Legacy base price: 10000000000000 (10 gwei)
            // Default priority fee: 1000000000 (1 gwei)
            // Total: 10000000000000 + 1000000000 = 10001000000000
            expect(fee.toString()).toEqual('10001000000000')
        })
    })

    describe('with Connex object', () => {
        it('returns zero for Connex objects', async () => {
            const mockConnex = {} as Connex
            
            const fee = await feeMarket(mockConnex)
            
            expect(fee.toString()).toEqual('0')
        })
    })
}) 