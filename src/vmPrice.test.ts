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


import vmPrice from './vmPrice';


describe('vmPrice', () => {
    test('returns a number', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const price = await vmPrice(clauses, 'https://node.vechain.energy', undefined);
        expect(typeof price).toBe('number');
    });

    test('returns a non-negative number', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const price = await vmPrice(clauses, 'https://node.vechain.energy', undefined);
        expect(price).toBeGreaterThanOrEqual(0);
    });

    test('returns the correct VM gas used', async () => {
        const clauses = [
            {
                to: "0x0000000000000000000000000000456E65726779",
                value: 1,
                data: "0x"
            }
        ];
        const price = await vmPrice(clauses, 'https://node.vechain.energy', undefined);
        expect(price).toEqual(791);

        // make sure the HTTP request was made
        expect(bentMock).toHaveBeenCalledWith('https://node.vechain.energy', 'POST', 'json', 200);
        expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
            clauses: clauses,
            caller: undefined
        });
    });
});