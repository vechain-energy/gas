import bent from 'bent'

export default async function vmPrice(clauses: Connex.VM.Clause[], nodeOrConnex: Connex | string, caller: string | undefined): Promise<number> {
    // get base price via HTTP request
    if (typeof nodeOrConnex === "string") {
        const postNode = bent(nodeOrConnex, 'POST', 'json', 200)
        const response = await postNode('/accounts/*', { clauses, caller })

        if (!Array.isArray(response)) {
            return 0
        }

        return response.reduce((gas, output) => gas + output.gasUsed, 0);
    }

    // alternatively, use connex
    const explainer = nodeOrConnex.thor
        .explain(clauses)

    if (caller !== undefined) {
        explainer.caller(caller)
    }

    const outputs = await explainer.execute()
    return outputs.reduce((gas, output) => gas + output.gasUsed, 0);
}