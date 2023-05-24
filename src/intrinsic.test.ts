import intrinsic from './intrinsic'
import { CLAUSE_GAS_CONTRACT_CREATION, CLAUSE_GAS, TX_GAS, ZERO_BYTES_GAS, NON_ZERO_BYTES_GAS } from './constants'

describe('intrinsic(clause[])', () => {
    it('returns basic tx gas for empty clauses', () => {
        expect(intrinsic([])).toEqual(TX_GAS)
    })

    it('calculates contract creation speciality', () => {
        expect(intrinsic([{ to: null, data: '0x', value: '0x' }])).toEqual(TX_GAS + CLAUSE_GAS_CONTRACT_CREATION)
    })

    it('calculates gas for each clause', () => {
        expect(intrinsic([
            { to: null, data: '0x', value: '0x' },
            { to: null, data: '0x', value: '0x' }
        ])).toEqual(TX_GAS + (CLAUSE_GAS_CONTRACT_CREATION * 2))
    })

    it('calculates clause gas', () => {
        expect(intrinsic([
            { to: '0x', data: '0x', value: '0x' },
            { to: '0x', data: '0x', value: '0x' }
        ])).toEqual(TX_GAS + (CLAUSE_GAS * 2))
    })

    it('calculates zero bytes data gas', () => {
        const amountZeroBytes = 3
        expect(intrinsic([{ to: '0x', data: `0x${'00'.repeat(amountZeroBytes)}`, value: '0x' }])).toEqual(TX_GAS + CLAUSE_GAS + (amountZeroBytes * ZERO_BYTES_GAS))
    })

    it('calculates non-zero bytes data gas', () => {
        const amountNonZeroBytes = 4
        expect(intrinsic([{ to: '0x', data: `0x${'11'.repeat(amountNonZeroBytes)}`, value: '0x' }])).toEqual(TX_GAS + CLAUSE_GAS + (amountNonZeroBytes * NON_ZERO_BYTES_GAS))
    })

    it('calculates correctly a test clause', () => {
        expect(intrinsic([
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            },
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x11"
            }
        ])).toEqual(37068)
    })
})