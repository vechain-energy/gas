import type { BigNumber } from "bignumber.js"
import { basePrice } from "./base-price";
import { intrinsicGas } from "./intrinsic-gas";
import { vmGas } from "./vm-gas";

type Options = {
    nodeOrConnex?: Connex | string
    caller?: string
    gasPriceCoef?: number
}

const defaultOptions = {
    nodeOrConnex: "https://mainnet.veblocks.net",
    gasPriceCoef: 0
}

export async function calcTxFee(clauses: Connex.VM.Clause[], _options: Options = {}): Promise<BigNumber> {
    const options = {
        ...defaultOptions,
        ..._options
    }

    const basePriceGas = await basePrice(options.nodeOrConnex)
    const intrinsic = intrinsicGas(clauses)
    const vm = await vmGas(clauses, options.nodeOrConnex, options.caller)

    const txGas = intrinsic + vm

    return basePriceGas
        .times(options.gasPriceCoef)
        .idiv(255)
        .plus(basePriceGas)
        .times(txGas)
}

