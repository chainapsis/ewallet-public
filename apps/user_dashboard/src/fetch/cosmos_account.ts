export interface CosmosAccountInfo {
  accountNumber: string;
  sequence: string;
}

interface AccountsResponse {
  account?: {
    "@type"?: string;
    account_number?: string;
    sequence?: string;
    base_account?: {
      account_number?: string;
      sequence?: string;
    };
    base_vesting_account?: {
      base_account?: {
        account_number?: string;
        sequence?: string;
      };
    };
  };
}

function pickAccountFields(
  account: AccountsResponse["account"],
): CosmosAccountInfo | undefined {
  if (!account) {
    return undefined;
  }

  if (account.account_number != null && account.sequence != null) {
    return {
      accountNumber: account.account_number,
      sequence: account.sequence,
    };
  }

  const base = account.base_account;
  if (base && base.account_number != null && base.sequence != null) {
    return { accountNumber: base.account_number, sequence: base.sequence };
  }

  const vestingBase = account.base_vesting_account?.base_account;
  if (
    vestingBase &&
    vestingBase.account_number != null &&
    vestingBase.sequence != null
  ) {
    return {
      accountNumber: vestingBase.account_number,
      sequence: vestingBase.sequence,
    };
  }

  return undefined;
}

export async function fetchCosmosAccount(
  restEndpoint: string,
  address: string,
): Promise<CosmosAccountInfo> {
  const response = await fetch(
    `${restEndpoint}/cosmos/auth/v1beta1/accounts/${address}`,
  );

  if (response.status === 404) {
    return { accountNumber: "0", sequence: "0" };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch account: ${response.statusText}`);
  }

  const data: AccountsResponse = await response.json();
  const account = pickAccountFields(data.account);

  if (!account) {
    return { accountNumber: "0", sequence: "0" };
  }

  return account;
}
