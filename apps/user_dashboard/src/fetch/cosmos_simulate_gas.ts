import { Buffer } from "buffer";

interface SimulateResponse {
  gas_info?: {
    gas_used?: string;
    gas_wanted?: string;
  };
}

export async function simulateCosmosGas(
  restEndpoint: string,
  txBytes: Uint8Array,
): Promise<number> {
  const response = await fetch(`${restEndpoint}/cosmos/tx/v1beta1/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_bytes: Buffer.from(txBytes).toString("base64"),
    }),
  });

  if (!response.ok) {
    throw new Error(`Simulate failed: ${response.statusText}`);
  }

  const data: SimulateResponse = await response.json();
  const gasUsed = data.gas_info?.gas_used;

  if (!gasUsed) {
    throw new Error("Simulate response missing gas_used");
  }

  const parsed = Number.parseInt(gasUsed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Simulate returned invalid gas_used: ${gasUsed}`);
  }

  return parsed;
}
