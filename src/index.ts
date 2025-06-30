import intrinsic from "./intrinsic";
import vmPrice from "./vmPrice";
import feeMarket, { FeeMarketOptions } from "./feeMarket";

type Options = {
    nodeOrConnex?: Connex | string
    caller?: string
    gasPriceCoef?: number
    // Fee market options
    maxFeePerGas?: string | number
    maxPriorityFeePerGas?: string | number
}

const defaultOptions = {
    nodeOrConnex: "https://mainnet.veblocks.net",
    gasPriceCoef: 0
}

export default async function estimate(clauses: Connex.VM.Clause[], _options: Options = {}): Promise<number> {
    const options = {
        ...defaultOptions,
        ..._options
    }

    const intrinsicGas = intrinsic(clauses)
    const vmGas = await vmPrice(clauses, options.nodeOrConnex, options.caller)

    const transactionGas = intrinsicGas + vmGas

    // Always use dynamic fee market (post-Galactica fork)
    const feeMarketOptions: FeeMarketOptions = {}
    if (options.maxFeePerGas !== undefined) {
        feeMarketOptions.maxFeePerGas = options.maxFeePerGas
    }
    if (options.maxPriorityFeePerGas !== undefined) {
        feeMarketOptions.maxPriorityFeePerGas = options.maxPriorityFeePerGas
    }
    
    const feePerGas = await feeMarket(options.nodeOrConnex, feeMarketOptions)

    // Calculate final gas cost
    const gasCost = feePerGas
        .times(transactionGas)
        .dividedBy(1e13)
        .decimalPlaces(0)

    return gasCost.toNumber()
}

