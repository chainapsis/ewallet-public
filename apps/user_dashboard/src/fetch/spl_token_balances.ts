import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

export interface SplTokenBalance {
  mint: string;
  amount: string;
  decimals: number;
}

export async function fetchSplTokenBalances(
  rpcEndpoint: string,
  ownerAddress: string,
): Promise<SplTokenBalance[]> {
  const connection = new Connection(rpcEndpoint);
  const owner = new PublicKey(ownerAddress);

  const [standardAccounts, token2022Accounts] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    }),
    connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_2022_PROGRAM_ID,
    }),
  ]);

  const allAccounts = [
    ...standardAccounts.value,
    ...token2022Accounts.value,
  ];

  const balances: SplTokenBalance[] = [];

  for (const { account } of allAccounts) {
    const parsed = account.data.parsed;
    if (parsed?.info?.tokenAmount) {
      const { mint, tokenAmount } = parsed.info;
      const amount = tokenAmount.amount as string;
      const decimals = tokenAmount.decimals as number;

      if (BigInt(amount) > BigInt(0)) {
        balances.push({ mint, amount, decimals });
      }
    }
  }

  return balances;
}
