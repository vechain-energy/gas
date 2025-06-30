# Vechain Gas Price Calculation

## Basic Usage

```shell
yarn add @vechain.energy/gas
```

```ts
import estimate from '@vechain.energy/gas'

const clauses = [{ data: '0x', value: '0x0', to: '0x1A6f69Bb160c199B1862c83291d364836558AE8F' }]
const gasEstimate = await estimate(clauses)
```

This will:

1. Calculate the intrinsic gas for the transaction
2. Estimate VM gas usage by simulating the clauses on the network
3. Calculate dynamic fees using the post-Galactica fork fee market (EIP-1559 style)
4. Return the total gas cost in VET

The gas estimation uses the modern dynamic fee market approach with base fee + priority fee calculation, applying the 4.6% priority fee cap rule for optimal transaction inclusion.

## Options

```ts
type Options = {
    nodeOrConnex?: Connex | string    // The network to load gas information from
    caller?: string                   // Optional caller address for VM gas estimation
    gasPriceCoef?: number             // Legacy gas price coefficient (0-255, kept for compatibility)
    maxFeePerGas?: string | number    // Maximum total fee per gas (EIP-1559 style)
    maxPriorityFeePerGas?: string | number  // Maximum priority fee per gas (EIP-1559 style)
}
```

### Default Options

```ts
const defaultOptions = {
    nodeOrConnex: "https://mainnet.veblocks.net",
    gasPriceCoef: 0,
}
```

### Dynamic Fee Market

The gas estimation uses VeChain's post-Galactica fork dynamic fee market:

- **Base Fee**: Automatically fetched from the latest block
- **Priority Fee**: Calculated using historical fee data or network suggestions
- **4.6% Rule**: Priority fee is capped at 4.6% of base fee for optimal inclusion
- **Fallback**: Uses legacy base gas price when dynamic fees are unavailable

### Examples

#### Basic Estimation
```ts
const gas = await estimate(clauses)
```

#### With Custom Priority Fee
```ts
const gas = await estimate(clauses, {
    maxPriorityFeePerGas: '2000000000' // 2 gwei
})
```

#### With Fee Cap
```ts
const gas = await estimate(clauses, {
    maxFeePerGas: '8000000000' // 8 gwei total cap
})
```

#### With Both Custom Fees
```ts
const gas = await estimate(clauses, {
    maxFeePerGas: '10000000000',      // 10 gwei total cap
    maxPriorityFeePerGas: '1500000000' // 1.5 gwei priority fee
})
```