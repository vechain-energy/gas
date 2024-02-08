import bent from 'bent'
import bn from 'bignumber.js'
import type { BigNumber } from "bignumber.js"
import Web3EthAbi from 'web3-eth-abi'

/**
 * Fetch Params VeChain smart contract to get the current base gas price.
 * @see {@link https://docs.vechain.org/tutorials/Useful-tips-for-building-a-dApp.html#_6-estimate-the-transaction-fee}
 * @return {Promise<BigNumber>} Base gas price.
 */
export async function basePrice(nodeOrConnex: Connex | string): Promise<BigNumber> {
    // get base price via HTTP request
    if (typeof nodeOrConnex === "string") {
        const postNode = bent(nodeOrConnex, 'POST', 'json', 200)
        const response = await postNode('/accounts/*', {
            clauses: [{
                to: '0x0000000000000000000000000000506172616d73',
                data: '0x8eaa6ac0000000000000000000000000000000000000626173652d6761732d7072696365',
                value: '0'
            }]
        })

        if (!Array.isArray(response)) {
            return new bn(0)
        }

        const data = response[0].data
        let decoded = Web3EthAbi.decodeParameter('uint256', data)
        return new bn(String(decoded))
    }

    // alternatively, use connex
    const outputs = await nodeOrConnex.thor
        .account("0x0000000000000000000000000000506172616d73")
        .method({
            "name": "get",
            "type": "function",
            "constant": true,
            "payable": false,
            "stateMutability": "view",
            "inputs": [{ "name": "key", "type": "bytes32" }],
            "outputs": [{ "name": "value", "type": "uint256" }]
        })
        .call('0x000000000000000000000000000000000000626173652d6761732d7072696365')
    return new bn(outputs.decoded.value);
}
