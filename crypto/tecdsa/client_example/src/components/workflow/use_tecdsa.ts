import { runKeygen } from "@oko-wallet/cait-sith-keplr-hooks/src/keygen";
import { runPresign } from "@oko-wallet/cait-sith-keplr-hooks/src/presign";
import { runSign } from "@oko-wallet/cait-sith-keplr-hooks/src/sign";
import { runTriples } from "@oko-wallet/cait-sith-keplr-hooks/src/triples";
import { useCallback, useRef, useState } from "react";

import { makeClientState } from "../../state";

export function useTECDSA() {
  const clientState = useRef(makeClientState());

  const [keygenResult, setKeygenResult] = useState<string[]>([]);
  const [triplesResult, setTriplesResult] = useState<string[]>([]);
  const [presignResult, setPresignResult] = useState<string[]>([]);
  const [signResult, setSignResult] = useState<string[]>([]);

  const [keygenError, setKeygenError] = useState<string | null>(null);
  const [triplesError, setTriplesError] = useState<string | null>(null);
  const [presignError, setPresignError] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const handleAddKeygenResult = useCallback(
    (arg: string) => {
      setKeygenResult((old) => [...old, arg]);
    },
    [setKeygenResult],
  );

  const handleAddTriplesResult = useCallback(
    (arg: string) => {
      setTriplesResult((old) => [...old, arg]);
    },
    [setTriplesResult],
  );

  const handleAddPresignResult = useCallback(
    (arg: string) => {
      setPresignResult((old) => [...old, arg]);
    },
    [setPresignResult],
  );

  const handleAddSignResult = useCallback(
    (arg: string) => {
      setSignResult((old) => [...old, arg]);
    },
    [setSignResult],
  );

  const handleClickKeygen = useCallback(async () => {
    // await runKeygen(clientState.current, handleAddKeygenResult, setKeygenError);
  }, [runKeygen, handleAddKeygenResult, setKeygenError]);

  const handleClickTriples = useCallback(async () => {
    // await runTriples(
    //   clientState.current,
    //   handleAddTriplesResult,
    //   setTriplesError,
    // );
  }, [runTriples, handleAddTriplesResult, setTriplesError]);

  const handleClickPresign = useCallback(async () => {
    // await runPresign(
    //   clientState.current,
    //   handleAddPresignResult,
    //   setPresignError,
    // );
  }, [runPresign, handleAddPresignResult, setPresignError]);

  const handleClickSign = useCallback(async () => {
    // await runSign(
    //   clientState.current,
    //   handleAddSignResult,
    //   setSignError,
    //   "keplr",
    // );
  }, [runPresign, handleAddSignResult, setSignError]);

  return {
    clientState,
    runKeygen,
    runPresign,
    runSign,

    handleClickKeygen,
    handleClickPresign,
    handleClickTriples,
    handleClickSign,

    keygenResult,
    triplesResult,
    presignResult,
    signResult,

    keygenError,
    triplesError,
    presignError,
    signError,
  };
}

export type SetResult = (arg: string) => void;
export type SetError = (arg: any) => void;
