import { TX_GAS, CLAUSE_GAS, CLAUSE_GAS_CONTRACT_CREATION, ZERO_BYTES_GAS, NON_ZERO_BYTES_GAS } from "./constants";

export default function intrinsic(clauses: Connex.VM.Clause[]): number {
    return clauses.reduce((sum, c) => {
        sum += c.to === null ? CLAUSE_GAS_CONTRACT_CREATION : CLAUSE_GAS
        sum += dataGas(c.data);
        return sum;
    }, TX_GAS);
}

function dataGas(data: string | undefined): number {
    if (data === undefined) { return 0 }

    const bytes = data.slice(2).match(/.{1,2}/g);
    if (bytes === null) { return 0 }

    const amountZeroBytes = bytes.reduce((amountZeroBytes, byte) => amountZeroBytes + (byte === '00' ? 1 : 0), 0);
    const amountNonZeroBytes = bytes.length - amountZeroBytes;

    return (amountNonZeroBytes * NON_ZERO_BYTES_GAS) + (amountZeroBytes * ZERO_BYTES_GAS);
}