interface FeemarketGasPricesResponse {
  prices?: { denom: string; amount: string }[];
}

export async function fetchFeemarketGasPrice(
  restEndpoint: string,
  feeDenom: string,
): Promise<string | undefined> {
  const response = await fetch(`${restEndpoint}/feemarket/v1/gas_prices`);
  if (!response.ok) {
    return undefined;
  }

  const data: FeemarketGasPricesResponse = await response.json();
  const match = data.prices?.find((price) => price.denom === feeDenom);
  return match?.amount;
}
