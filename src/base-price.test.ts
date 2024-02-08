const postNodeMock = jest.fn().mockResolvedValue([
  {
    "data": "0x000000000000000000000000000000000000000000000000000009184e72a000",
    "events": [],
    "transfers": [],
    "gasUsed": 591,
    "reverted": false,
    "vmError": ""
  }
]);
const bentMock = jest.fn().mockReturnValue(postNodeMock);
jest.mock('bent', () => bentMock, { virtual: true });

import bn from 'bignumber.js';
import { basePrice } from './base-price';

describe('basePrice', () => {
  it('returns a BigNumber', async () => {
    const price = await basePrice('https://node.vechain.energy');
    expect(price).toBeInstanceOf(bn)
  });

  it('returns the correct base price', async () => {
    const price = await basePrice('https://node.vechain.energy');
    expect(price.toString()).toEqual("10000000000000");

    // make sure the HTTP request was made
    expect(bentMock).toHaveBeenCalledWith('https://node.vechain.energy', 'POST', 'json', 200);
    expect(postNodeMock).toHaveBeenCalledWith('/accounts/*', {
      clauses: [{
        to: '0x0000000000000000000000000000506172616d73',
        data: '0x8eaa6ac0000000000000000000000000000000000000626173652d6761732d7072696365',
        value: '0'
      }]
    });
  });
});
