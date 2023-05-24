import bent from 'bent'
import { MAGIC_GAS } from './constants'

export default async function vmPrice(clauses: Connex.VM.Clause[], nodeOrConnex: Connex | string, _caller?: string): Promise<number> {
    // set default caller for contract creation, because address(0) will revert and return too little gas
    const caller = !_caller && clauses.some(({ to }) => !to) ? '0x0000000000000000000000000000000000000001' : _caller

    // get base price via HTTP request
    if (typeof nodeOrConnex === "string") {
        const postNode = bent(nodeOrConnex, 'POST', 'json', 200)
        const response = await postNode('/accounts/*', { clauses, caller })

        if (!Array.isArray(response)) {
            return 0
        }

        const gas = response.reduce((gas, output) => gas + output.gasUsed, MAGIC_GAS);
        return gas === MAGIC_GAS ? 0 : gas
    }

    // alternatively, use connex
    const explainer = nodeOrConnex.thor.explain(clauses)

    if (caller !== undefined) {
        explainer.caller(caller)
    }

    const outputs = await explainer.execute()
    const gas = outputs.reduce((gas, output) => gas + output.gasUsed, MAGIC_GAS);
    return gas === MAGIC_GAS ? 0 : gas
}