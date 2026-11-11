/*
 * A Relay request id only describes a tracked hop when that request was started by the hop's own source transaction.
 * Without this check a crafted link (?tx=<someone's tx>&rid=<another request>) could show another request's status.
 * EVM hashes compare case-insensitively; Solana signatures are base58 and compare exactly.
 */
export function relayMatchesTx(inTxHashes: readonly string[] | null | undefined, tx: string): boolean {
  if (!inTxHashes?.length || !tx) return false;
  const evm = /^0x[0-9a-fA-F]{64}$/.test(tx);
  return inTxHashes.some((h) => (evm ? h.toLowerCase() === tx.toLowerCase() : h === tx));
}
