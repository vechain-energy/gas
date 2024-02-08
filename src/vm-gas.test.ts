const postNodeMock = jest.fn().mockResolvedValue([
    {
        "data": "0x000000000000000000000000000000000000000000000000000009184e72a000",
        "events": [],
        "transfers": [],
        "gasUsed": 591,
        "reverted": false,
        "vmError": ""
    },
    {
        "data": "0x000000000000000000000000000000000000000000000000000009184e72a000",
        "events": [],
        "transfers": [],
        "gasUsed": 200,
        "reverted": false,
        "vmError": ""
    }
]);
const bentMock = jest.fn().mockReturnValue(postNodeMock);
jest.mock('bent', () => bentMock, { virtual: true });


import { vmGas } from './vm-gas';
import { VM_GAS } from './constants';

describe('vmPrice(clauses, nodeOrConnex, caller)', () => {
    it('returns a number', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const price = await vmGas(clauses, 'https://node.vechain.energy');
        expect(typeof price).toBe('number');
    });

    it('returns a non-negative number', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const price = await vmGas(clauses, 'https://node.vechain.energy');
        expect(price).toBeGreaterThanOrEqual(0);
    });

    it('returns the VM gas used with VM_GAS added', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const price = await vmGas(clauses, 'https://node.vechain.energy');
        expect(price).toEqual(VM_GAS + 791);

        // make sure the HTTP request was made
        expect(bentMock).toHaveBeenCalledWith('https://node.vechain.energy', 'POST', 'json', 200);
        expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
            clauses: clauses,
            caller: undefined
        });
    });

    it('returns the 0 if no VM gas is used', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        postNodeMock.mockResolvedValueOnce([
            {
                "data": "0x000000000000000000000000000000000000000000000000000009184e72a000",
                "events": [],
                "transfers": [],
                "gasUsed": 0,
                "reverted": false,
                "vmError": ""
            }

        ]);
        const price = await vmGas(clauses, 'https://node.vechain.energy');
        expect(price).toEqual(0);

        // make sure the HTTP request was made
        expect(bentMock).toHaveBeenCalledWith('https://node.vechain.energy', 'POST', 'json', 200);
        expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
            clauses: clauses,
            caller: undefined
        });
    });


    it('passes the caller', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const caller = '0x0000000000000000000000000000000000000000'
        await vmGas(clauses, 'https://node.vechain.energy', caller);

        // make sure the HTTP request was made
        expect(bentMock).toHaveBeenCalledWith('https://node.vechain.energy', 'POST', 'json', 200);
        expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
            clauses: clauses,
            caller
        });
    });

    it('sets the caller to 0x...01 as default for contract creation', async () => {
        const clauses = [
            {
                to: null,
                value: 1,
                data: "0x"
            }
        ];
        await vmGas(clauses, 'https://node.vechain.energy');

        // make sure the HTTP request was made
        expect(bentMock).toHaveBeenCalledWith('https://node.vechain.energy', 'POST', 'json', 200);
        expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
            clauses: clauses,
            caller: '0x0000000000000000000000000000000000000001'
        });
    });

});
