import bent from 'bent'
import BigNumber from 'bignumber.js'

export interface FeeMarketOptions {
    maxFeePerGas?: string | number
    maxPriorityFeePerGas?: string | number
}

export interface FeeHistoryResponse {
    oldestBlock: string
    baseFeePerGas: string[]
    gasUsedRatio: string[]
    reward?: string[][]
}

export interface FeeHistoryOptions {
    blockCount: number
    newestBlock: string
    rewardPercentiles?: number[]
}

interface BlockResponse {
    baseFeePerGas?: string
    [key: string]: any
}

interface PriorityFeeResponse {
    maxPriorityFeePerGas?: string
    [key: string]: any
}

export default async function feeMarket(
    nodeOrConnex: Connex | string,
    options: FeeMarketOptions = {}
): Promise<BigNumber> {
    if (typeof nodeOrConnex === "string") {
        return await calculateDynamicFee(nodeOrConnex, options)
    }
    
    // For Connex, fall back to legacy calculation
    return new BigNumber(0)
}

async function calculateDynamicFee(nodeUrl: string, options: FeeMarketOptions): Promise<BigNumber> {
    // Get current base fee from latest block
    const baseFee = await getBaseFeePerGas(nodeUrl)
    
    // Calculate priority fee
    let priorityFee: BigNumber
    if (options.maxPriorityFeePerGas !== undefined) {
        priorityFee = new BigNumber(options.maxPriorityFeePerGas)
    } else {
        priorityFee = await calculateOptimalPriorityFee(nodeUrl, baseFee)
    }
    
    const totalFeePerGas = baseFee.plus(priorityFee)
    
    // Apply maxFeePerGas cap if specified
    if (options.maxFeePerGas !== undefined) {
        const maxFee = new BigNumber(options.maxFeePerGas)
        return BigNumber.min(totalFeePerGas, maxFee)
    }
    
    return totalFeePerGas
}

async function getBaseFeePerGas(nodeUrl: string): Promise<BigNumber> {
    const getNode = bent(nodeUrl, 'GET', 'json', 200)
    
    try {
        const response = await getNode('/blocks/best') as BlockResponse
        
        if (response && response.baseFeePerGas) {
            return new BigNumber(response.baseFeePerGas)
        }
        
        // Fallback to legacy base gas price if baseFeePerGas not available
        return await getLegacyBaseGasPrice(nodeUrl)
    } catch (error) {
        // Fallback to legacy base gas price
        return await getLegacyBaseGasPrice(nodeUrl)
    }
}

async function getLegacyBaseGasPrice(nodeUrl: string): Promise<BigNumber> {
    const postNode = bent(nodeUrl, 'POST', 'json', 200)
    
    const response = await postNode('/accounts/*', {
        clauses: [{
            to: '0x0000000000000000000000000000506172616d73',
            data: '0x8eaa6ac0000000000000000000000000000000000000626173652d6761732d7072696365',
            value: '0'
        }]
    })

    if (!Array.isArray(response)) {
        return new BigNumber(0)
    }

    const data = response[0].data
    // Simple hex to decimal conversion for uint256
    const decoded = new BigNumber(data.slice(2), 16)
    return decoded
}

async function calculateOptimalPriorityFee(nodeUrl: string, baseFee: BigNumber): Promise<BigNumber> {
    try {
        // Get fee history for recent blocks
        const feeHistory = await getFeeHistory(nodeUrl, {
            blockCount: 10,
            newestBlock: 'best',
            rewardPercentiles: [25, 50, 75]
        })
        
        let percentile75: BigNumber = new BigNumber(0)
        
        if (feeHistory.reward && feeHistory.reward.length > 0) {
            const latestBlockRewards = feeHistory.reward[feeHistory.reward.length - 1]
            const equalRewardsOnLastBlock = new Set(latestBlockRewards).size === 3
            
            if (equalRewardsOnLastBlock) {
                // Use 75th percentile from latest block
                percentile75 = new BigNumber(latestBlockRewards[2], 16)
            } else {
                // Calculate average of 75th percentiles across blocks
                let sum = new BigNumber(0)
                let count = 0
                
                for (const blockRewards of feeHistory.reward) {
                    if (blockRewards.length > 2 && blockRewards[2]) {
                        sum = sum.plus(new BigNumber(blockRewards[2], 16))
                        count++
                    }
                }
                
                percentile75 = count > 0 ? sum.dividedBy(count) : new BigNumber(0)
            }
        } else {
            // Fallback to network-suggested priority fee
            percentile75 = await getMaxPriorityFeePerGas(nodeUrl)
        }
        
        // Calculate 4.6% of base fee (HIGH speed threshold)
        const baseFeeCap = baseFee.times(46).dividedBy(1000)
        
        // Use minimum of historical vs. cap values
        return BigNumber.min(baseFeeCap, percentile75)
        
    } catch (error) {
        // Fallback to network-suggested priority fee
        return await getMaxPriorityFeePerGas(nodeUrl)
    }
}

async function getFeeHistory(nodeUrl: string, options: FeeHistoryOptions): Promise<FeeHistoryResponse> {
    const getNode = bent(nodeUrl, 'GET', 'json', 200)
    
    const queryParams = new URLSearchParams({
        blockCount: options.blockCount.toString(),
        newestBlock: options.newestBlock
    })
    
    if (options.rewardPercentiles) {
        queryParams.append('rewardPercentiles', options.rewardPercentiles.join(','))
    }
    
    const response = await getNode(`/fees/history?${queryParams.toString()}`)
    
    if (!response || typeof response !== 'object') {
        throw new Error('Invalid fee history response')
    }
    
    return response as FeeHistoryResponse
}

async function getMaxPriorityFeePerGas(nodeUrl: string): Promise<BigNumber> {
    const getNode = bent(nodeUrl, 'GET', 'json', 200)
    
    try {
        const response = await getNode('/fees/priority') as PriorityFeeResponse
        
        if (response && response.maxPriorityFeePerGas) {
            return new BigNumber(response.maxPriorityFeePerGas, 16)
        }
        
        // Fallback to a reasonable default
        return new BigNumber(1000000000) // 1 gwei
    } catch (error) {
        // Fallback to a reasonable default
        return new BigNumber(1000000000) // 1 gwei
    }
} 