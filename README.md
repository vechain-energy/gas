# Vechain Gas Price Calculation

## Basic Usage

```shell
yarn add @vechain.energy/gas
```

```ts
import estimate from '@vechain.energy/gas'

const clauses = [{ data: '0x', value: '0x0', to: '0x1A6f69Bb160c199B1862c83291d364836558AE8F' }]
const gasEstimate = await estimate (clauses)
```

This will:

1. calculate the intrinsic gas
2. load the base price from the network
3. send the clause for vm gas estimation to the network

It will apply the gas calculation with a default gas coef of 0 based on https://docs.vechain.org/thor/learn/transaction-calculation.html

Options are:

```ts
type Options = {
    nodeOrConnex?: Connex | string  // the network to load additional gas information from
    caller?: string                 // optional caller address for the vm gas estimation
    gasPriceCoef?: number           // priority, 0 (low) to 255 (high)}
```

which default to:

```ts
const defaultOptions = {
    nodeOrConnex: "https://mainnet.veblocks.net",
    gasPriceCoef: 0,
}
```