import estimate from './index'
import { MAGIC_GAS } from './constants'

describe('intrinsic(clause[])', () => {
    it('calculates correctly a test clause with gasPriceCoef of 0', async () => {
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ])

        expect(gas).toEqual(21046 + MAGIC_GAS)
    })

    it('calculates correctly a test clause with gasPriceCoef of 255', async () => {
        const gas = await estimate([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: '0x01',
                data: "0x"
            }
        ], { gasPriceCoef: 255 })

        expect(gas).toEqual(72092)
    })

    it('calculates correctly a pure vet test clause with gasPriceCoef of 0', async () => {
        const gas = await estimate([
            {
                to: "0x1A6f69Bb160c199B1862c83291d364836558AE8F",
                value: '0x0',
                data: "0x"
            }
        ])

        expect(gas).toEqual(21000)
    })

})