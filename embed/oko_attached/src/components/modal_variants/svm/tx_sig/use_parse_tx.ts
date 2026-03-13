import { useEffect, useState } from "react";

import {
  deserializeTransaction,
  type ParsedTransaction,
  parseTransaction,
} from "@oko-wallet-attached/tx-parsers/svm";
import { base64ToUint8Array } from "@oko-wallet-attached/utils/base64";

export interface UseParseTxResult {
  parsedTx: ParsedTransaction | null;
  parseError: string | null;
  isLoading: boolean;
}

export function useParseTx(serializedTransaction: string): UseParseTxResult {
  const [parsedTx, setParsedTx] = useState<ParsedTransaction | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function parseTx() {
      setIsLoading(true);
      try {
        const txBytes = base64ToUint8Array(serializedTransaction);
        const deserializeResult = deserializeTransaction(txBytes);

        if (!deserializeResult.success) {
          setParseError(deserializeResult.error);
          setIsLoading(false);
          return;
        }

        const parseResult = await parseTransaction(deserializeResult.data);

        if (!parseResult.success) {
          setParseError(parseResult.error);
          setIsLoading(false);
          return;
        }

        setParsedTx(parseResult.data);
        setParseError(null);
      } catch (err) {
        setParseError(String(err));
      } finally {
        setIsLoading(false);
      }
    }

    parseTx();
  }, [serializedTransaction]);

  return { parsedTx, parseError, isLoading };
}
