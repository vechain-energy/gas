import intrinsic from "./intrinsic";
import basePrice from "./basePrice";
import vmPrice from "./vmPrice";

type Options = {
    nodeOrConnex?: Connex | string
    caller?: string
    gasPriceCoef?: number
    bufferGas?: number
}

const defaultOptions = {
    nodeOrConnex: "https://mainnet.veblocks.net",
    gasPriceCoef: 0,
    bufferGas: 0
}

export default async function estimate(clauses: Connex.VM.Clause[], _options: Options = {}): Promise<number> {
    const options = {
        ...defaultOptions,
        ..._options
    }

    const intrinsicGas = intrinsic(clauses)
    const basePriceGas = await basePrice(options.nodeOrConnex)
    const vmGas = await vmPrice(clauses, options.nodeOrConnex, options.caller)

    const transactionGas = intrinsicGas + vmGas + options.bufferGas

    const gas = basePriceGas
        .idiv(255)
        .times(options.gasPriceCoef)
        .plus(basePriceGas)
        .times(transactionGas)
        .dividedBy(1e13)
        .decimalPlaces(0)

    return gas.toNumber()
}

