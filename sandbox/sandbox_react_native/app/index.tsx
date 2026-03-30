import type { OkoWalletInterface } from "@oko-wallet/oko-sdk-core";
import type { OkoWalletRN } from "@oko-wallet/oko-sdk-core-react-native";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import {
  OkoSvmWallet,
  type OkoSvmWalletInterface,
} from "@oko-wallet/oko-sdk-svm";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ─── Config ───

const COSMOS_CHAIN_ID = "cosmoshub-4";
const TOKEN_MINIMAL_DENOM = "uatom";
const SOLANA_RPC_URL = "https://api.devnet.solana.com";

// ─── Main Screen ───

export default function Index() {
  const okoWallet = useOkoWallet();
  const [initStatus, setInitStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    okoWallet.waitUntilInitialized.then((res) => {
      setInitStatus(res.success ? "ready" : "error");
    });
  }, [okoWallet]);

  if (initStatus === "loading") {
    return (
      <View style={styles.center}>
        <Text style={styles.h1}>Oko Wallet RN Sandbox</Text>
        <Text style={styles.muted}>Initializing SDK...</Text>
      </View>
    );
  }

  if (initStatus === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.h1}>Oko Wallet RN Sandbox</Text>
        <Text style={styles.error}>Init failed. Check SDK endpoint.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.h1}>Oko Wallet RN Sandbox</Text>
      <WalletInfoSection wallet={okoWallet} />
      <LoginSection wallet={okoWallet} />
      <CosmosSection wallet={okoWallet} />
      <EthSection wallet={okoWallet} />
      <SolanaSection wallet={okoWallet} />
    </ScrollView>
  );
}

// ─── Wallet Info ───

function WalletInfoSection({ wallet }: { wallet: OkoWalletRN }) {
  const [info, setInfo] = useState(wallet.state);

  useEffect(() => {
    const handler = {
      type: "CORE__accountsChanged" as const,
      handler: (_data: { publicKey: string | null; email: string | null }) => {
        setInfo({ ...wallet.state });
      },
    };
    wallet.on(handler);
    return () => wallet.off(handler);
  }, [wallet]);

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Wallet State</Text>
      <InfoRow label="Auth Type" value={info.authType ?? "not signed in"} />
      <InfoRow label="Email" value={info.email ?? "-"} />
      <InfoRow
        label="Public Key"
        value={info.publicKey ? `${info.publicKey.slice(0, 20)}...` : "-"}
      />
      <InfoRow label="Name" value={info.name ?? "-"} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Login ───

function LoginSection({ wallet }: { wallet: OkoWalletRN }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = useCallback(
    async (
      type: "google" | "x" | "discord" | "github" | "email" | "telegram",
    ) => {
      setLoading(type);
      try {
        await wallet.signIn(type);
        Alert.alert("Success", `Signed in with ${type}`);
      } catch (err) {
        Alert.alert("Error", String(err));
      } finally {
        setLoading(null);
      }
    },
    [wallet],
  );

  const handleSignOut = useCallback(async () => {
    setLoading("signout");
    try {
      await wallet.signOut();
    } catch (err) {
      Alert.alert("Error", String(err));
    } finally {
      setLoading(null);
    }
  }, [wallet]);

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Sign In</Text>
      <View style={styles.btnRow}>
        <Btn
          title="Google"
          onPress={() => handleSignIn("google")}
          loading={loading === "google"}
        />
        <Btn
          title="X"
          onPress={() => handleSignIn("x")}
          loading={loading === "x"}
        />
        <Btn
          title="Discord"
          onPress={() => handleSignIn("discord")}
          loading={loading === "discord"}
        />
        <Btn
          title="GitHub"
          onPress={() => handleSignIn("github")}
          loading={loading === "github"}
        />
        <Btn
          title="Telegram"
          onPress={() => handleSignIn("telegram")}
          loading={loading === "telegram"}
        />
        <Btn
          title="Email"
          onPress={() => handleSignIn("email")}
          loading={loading === "email"}
        />
      </View>
      <Btn
        title="Sign Out"
        onPress={handleSignOut}
        loading={loading === "signout"}
        color="#cc3333"
      />
    </View>
  );
}

// ─── Cosmos ───

function CosmosSection({ wallet }: { wallet: OkoWalletRN }) {
  const cosmos = useMemo(
    () => new OkoCosmosWallet(wallet as unknown as OkoWalletInterface),
    [wallet],
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleGetKey = useCallback(async () => {
    setLoading("getKey");
    setResult(null);
    try {
      const key = await cosmos.getKey(COSMOS_CHAIN_ID);
      setResult(`Address: ${key.bech32Address}`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [cosmos]);

  const handleSignArbitrary = useCallback(async () => {
    setLoading("signArb");
    setResult(null);
    try {
      const key = await cosmos.getKey(COSMOS_CHAIN_ID);
      const sig = await cosmos.signArbitrary(
        COSMOS_CHAIN_ID,
        key.bech32Address,
        "Hello from Oko RN Sandbox!",
      );
      setResult(`Signature: ${sig.signature.slice(0, 30)}...`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [cosmos]);

  const handleSignDirect = useCallback(async () => {
    setLoading("signDirect");
    setResult(null);
    try {
      const {
        makeSignDoc: makeProtoSignDoc,
      } = require("@cosmjs/proto-signing");
      const {
        AuthInfo,
        Fee,
        TxBody,
      } = require("@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx");
      const {
        MsgSend,
      } = require("@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx");
      const {
        PubKey,
      } = require("@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys");
      const {
        SignMode,
      } = require("@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing");

      const account = await cosmos.getKey(COSMOS_CHAIN_ID);
      const address = account.bech32Address;

      const bodyBytes = TxBody.encode(
        TxBody.fromPartial({
          messages: [
            {
              typeUrl: "/cosmos.bank.v1beta1.MsgSend",
              value: MsgSend.encode({
                fromAddress: address,
                toAddress: address,
                amount: [{ denom: TOKEN_MINIMAL_DENOM, amount: "10" }],
              }).finish(),
            },
          ],
          memo: "",
        }),
      ).finish();

      const authInfoBytes = AuthInfo.encode({
        signerInfos: [
          {
            publicKey: {
              typeUrl: "/cosmos.crypto.secp256k1.PubKey",
              value: PubKey.encode({ key: account.pubKey }).finish(),
            },
            modeInfo: {
              single: { mode: SignMode.SIGN_MODE_DIRECT },
              multi: undefined,
            },
            sequence: "0",
          },
        ],
        fee: Fee.fromPartial({
          amount: [{ denom: TOKEN_MINIMAL_DENOM, amount: "1000" }],
          gasLimit: "200000",
        }),
      }).finish();

      const signDoc = makeProtoSignDoc(
        bodyBytes,
        authInfoBytes,
        COSMOS_CHAIN_ID,
        1288582,
      );
      const res = await cosmos.signDirect(COSMOS_CHAIN_ID, address, signDoc, {
        preferNoSetFee: true,
        disableBalanceCheck: true,
      });
      setResult(`SignDirect OK: ${res.signature.signature.slice(0, 30)}...`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [cosmos]);

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Cosmos ({COSMOS_CHAIN_ID})</Text>
      <Text style={styles.label}>Offchain</Text>
      <View style={styles.btnRow}>
        <Btn
          title="getKey"
          onPress={handleGetKey}
          loading={loading === "getKey"}
        />
        <Btn
          title="signArbitrary"
          onPress={handleSignArbitrary}
          loading={loading === "signArb"}
        />
      </View>
      <Text style={styles.label}>Onchain</Text>
      <View style={styles.btnRow}>
        <Btn
          title="signDirect"
          onPress={handleSignDirect}
          loading={loading === "signDirect"}
        />
      </View>
      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
}

// ─── Ethereum ───

function EthSection({ wallet }: { wallet: OkoWalletRN }) {
  const eth = useMemo(
    () => new OkoEthWallet(wallet as unknown as OkoWalletInterface),
    [wallet],
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleGetAddress = useCallback(async () => {
    setLoading("getAddr");
    setResult(null);
    try {
      const addr = await eth.getAddress();
      setResult(`Address: ${addr}`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [eth]);

  const handlePersonalSign = useCallback(async () => {
    setLoading("sign");
    setResult(null);
    try {
      const sig = await eth.sign("Hello from Oko RN Sandbox!");
      setResult(`Signature: ${sig.slice(0, 30)}...`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [eth]);

  const handleSignTransaction = useCallback(async () => {
    setLoading("signTx");
    setResult(null);
    try {
      const { parseUnits, parseAbi, encodeFunctionData } = require("viem");

      const provider = await eth.getEthereumProvider();
      const address = await eth.getAddress();

      const toAddress = "0xbb6B34131210C091cb2890b81fCe7103816324a5";
      const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const transferAmount = parseUnits("0", 6);

      const abi = parseAbi([
        "function transfer(address to, uint256 amount) public returns (bool)",
      ]);
      const data = encodeFunctionData({
        abi,
        functionName: "transfer",
        args: [toAddress, transferAmount],
      });

      const signedTx = await provider.request({
        method: "eth_signTransaction",
        params: [
          {
            type: "0x2",
            from: address,
            to: usdcAddress,
            data,
            value: "0x0",
          },
        ],
      });

      setResult(`SignTx OK: ${signedTx.slice(0, 30)}...`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [eth]);

  const handleSignTypedData = useCallback(async () => {
    setLoading("signTyped");
    setResult(null);
    try {
      const provider = await eth.getEthereumProvider();
      const address = await eth.getAddress();

      const typedData = {
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract:
            "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as const,
        },
        primaryType: "Mail" as const,
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        },
        message: {
          from: {
            name: "Alice",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello from Oko RN Sandbox!",
        },
      };

      const sig = await provider.request({
        method: "eth_signTypedData_v4",
        params: [address, typedData],
      });

      setResult(`TypedData sig: ${sig.slice(0, 30)}...`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [eth]);

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Ethereum</Text>
      <Text style={styles.label}>Offchain</Text>
      <View style={styles.btnRow}>
        <Btn
          title="getAddress"
          onPress={handleGetAddress}
          loading={loading === "getAddr"}
        />
        <Btn
          title="personal_sign"
          onPress={handlePersonalSign}
          loading={loading === "sign"}
        />
        <Btn
          title="signTypedData"
          onPress={handleSignTypedData}
          loading={loading === "signTyped"}
        />
      </View>
      <Text style={styles.label}>Onchain</Text>
      <View style={styles.btnRow}>
        <Btn
          title="signTransaction"
          onPress={handleSignTransaction}
          loading={loading === "signTx"}
        />
      </View>
      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
}

// ─── Solana ───

function SolanaSection({ wallet }: { wallet: OkoWalletRN }) {
  const svmRef = useMemo<{ current: OkoSvmWalletInterface | null }>(
    () => ({ current: null }),
    [],
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const getSvm = useCallback(() => {
    if (!svmRef.current) {
      svmRef.current = new OkoSvmWallet(
        wallet as unknown as OkoWalletInterface,
        { chain_id: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" },
      ) as unknown as OkoSvmWalletInterface;
    }
    return svmRef.current;
  }, [wallet, svmRef]);

  const ensureConnected = useCallback(async () => {
    const svm = getSvm();
    if (!svm.connected) {
      await svm.connect();
    }
    if (!svm.publicKey) {
      throw new Error("No Solana public key available");
    }
    return svm;
  }, [getSvm]);

  const handleGetAddress = useCallback(async () => {
    setLoading("getAddr");
    setResult(null);
    try {
      const svm = await ensureConnected();
      setResult(`Address: ${svm.publicKey!.toBase58()}`);
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [ensureConnected]);

  const handleSignMessage = useCallback(async () => {
    setLoading("signMsg");
    setResult(null);
    try {
      const svm = await ensureConnected();
      const message = new TextEncoder().encode("Hello from Oko RN Sandbox!");
      const signature = await svm.signMessage(message);
      setResult(
        `Signature: ${Buffer.from(signature).toString("hex").slice(0, 30)}...`,
      );
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [ensureConnected]);

  const handleSignTransaction = useCallback(async () => {
    setLoading("signTx");
    setResult(null);
    try {
      const svm = await ensureConnected();
      const {
        Connection,
        PublicKey,
        SystemProgram,
        TransactionMessage,
        VersionedTransaction,
        LAMPORTS_PER_SOL,
      } = require("@solana/web3.js");

      const connection = new Connection(SOLANA_RPC_URL);
      const toAddress = new PublicKey("11111111111111111111111111111111");
      const { blockhash } = await connection.getLatestBlockhash();

      const instructions = [
        SystemProgram.transfer({
          fromPubkey: svm.publicKey!,
          toPubkey: toAddress,
          lamports: 0.001 * LAMPORTS_PER_SOL,
        }),
      ];

      const messageV0 = new TransactionMessage({
        payerKey: svm.publicKey!,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(messageV0);
      const signed = await svm.signTransaction(tx);
      setResult(
        `SignTx OK: ${Buffer.from(signed.signatures[0]).toString("hex").slice(0, 30)}...`,
      );
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [ensureConnected]);

  const handleMultiSolTransfer = useCallback(async () => {
    setLoading("multiSol");
    setResult(null);
    try {
      const svm = await ensureConnected();
      const {
        Connection,
        PublicKey,
        SystemProgram,
        Transaction,
        LAMPORTS_PER_SOL,
      } = require("@solana/web3.js");

      const connection = new Connection(SOLANA_RPC_URL);
      const { blockhash } = await connection.getLatestBlockhash();

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: svm.publicKey!,
      });

      for (let i = 0; i < 3; i++) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: svm.publicKey!,
            toPubkey: new PublicKey(`1111111111111111111111111111111${i + 2}`),
            lamports: (0.0001 + i * 0.0001) * LAMPORTS_PER_SOL,
          }),
        );
      }

      const signed = await svm.signTransaction(tx);
      setResult(
        `Multi SOL Transfer OK: ${Buffer.from(signed.signature!).toString("hex").slice(0, 30)}...`,
      );
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [ensureConnected]);

  const handleNativeStake = useCallback(async () => {
    setLoading("stake");
    setResult(null);
    try {
      const svm = await ensureConnected();
      const {
        Connection,
        PublicKey,
        Keypair,
        Transaction,
        StakeProgram,
        Authorized,
        Lockup,
        LAMPORTS_PER_SOL,
      } = require("@solana/web3.js");

      const connection = new Connection(SOLANA_RPC_URL);
      const { blockhash } = await connection.getLatestBlockhash();

      const stakeAccount = Keypair.generate();
      const validatorVoteAccount = new PublicKey(
        "CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu",
      );

      const stakeAmount = 1 * LAMPORTS_PER_SOL;
      const rentExemptAmount = 2282880;

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: svm.publicKey!,
      });

      tx.add(
        StakeProgram.createAccount({
          fromPubkey: svm.publicKey!,
          stakePubkey: stakeAccount.publicKey,
          authorized: new Authorized(svm.publicKey!, svm.publicKey!),
          lockup: new Lockup(0, 0, svm.publicKey!),
          lamports: stakeAmount + rentExemptAmount,
        }),
      );

      tx.add(
        StakeProgram.delegate({
          stakePubkey: stakeAccount.publicKey,
          authorizedPubkey: svm.publicKey!,
          votePubkey: validatorVoteAccount,
        }),
      );

      tx.partialSign(stakeAccount);

      const signed = await svm.signTransaction(tx);
      setResult(
        `Stake OK: ${Buffer.from(signed.signature!).toString("hex").slice(0, 30)}...`,
      );
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [ensureConnected]);

  const handleSwapDemo = useCallback(async () => {
    setLoading("swap");
    setResult(null);
    try {
      const svm = await ensureConnected();
      const {
        Connection,
        PublicKey,
        ComputeBudgetProgram,
        Transaction,
        TransactionInstruction,
      } = require("@solana/web3.js");

      const TOKEN_PROGRAM_ID = new PublicKey(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      );

      const connection = new Connection(SOLANA_RPC_URL);
      const { blockhash } = await connection.getLatestBlockhash();

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: svm.publicKey!,
      });

      // Compute Budget instructions
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      );

      // Token Approve instruction
      const mockTokenAccount = PublicKey.findProgramAddressSync(
        [
          svm.publicKey!.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(
            "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          ).toBuffer(),
        ],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      )[0];

      const approveData = Buffer.alloc(9);
      approveData.writeUInt8(4, 0);
      approveData.writeBigUInt64LE(BigInt(1_000_000), 1);

      tx.add(
        new TransactionInstruction({
          keys: [
            { pubkey: mockTokenAccount, isSigner: false, isWritable: true },
            {
              pubkey: new PublicKey("11111111111111111111111111111112"),
              isSigner: false,
              isWritable: false,
            },
            { pubkey: svm.publicKey!, isSigner: true, isWritable: false },
          ],
          programId: TOKEN_PROGRAM_ID,
          data: approveData,
        }),
      );

      // Transfer instructions simulating swap internals
      for (let i = 0; i < 3; i++) {
        tx.add(
          new TransactionInstruction({
            keys: [
              { pubkey: svm.publicKey!, isSigner: true, isWritable: true },
              {
                pubkey: new PublicKey(
                  `1111111111111111111111111111111${i + 2}`,
                ),
                isSigner: false,
                isWritable: true,
              },
            ],
            programId: TOKEN_PROGRAM_ID,
            data: Buffer.from([3, ...new Array(8).fill(0)]),
          }),
        );
      }

      const signed = await svm.signTransaction(tx);
      setResult(
        `Swap Demo OK: ${Buffer.from(signed.signature!).toString("hex").slice(0, 30)}...`,
      );
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }, [ensureConnected]);

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Solana (devnet)</Text>
      <View style={styles.btnRow}>
        <Btn
          title="getAddress"
          onPress={handleGetAddress}
          loading={loading === "getAddr"}
        />
      </View>
      <Text style={styles.label}>Offchain</Text>
      <View style={styles.btnRow}>
        <Btn
          title="signMessage"
          onPress={handleSignMessage}
          loading={loading === "signMsg"}
        />
      </View>
      <Text style={styles.label}>Onchain</Text>
      <View style={styles.btnRow}>
        <Btn
          title="signTransaction"
          onPress={handleSignTransaction}
          loading={loading === "signTx"}
        />
        <Btn
          title="multiSolTransfer"
          onPress={handleMultiSolTransfer}
          loading={loading === "multiSol"}
        />
      </View>
      <View style={styles.btnRow}>
        <Btn
          title="nativeStake"
          onPress={handleNativeStake}
          loading={loading === "stake"}
        />
        <Btn
          title="swapDemo"
          onPress={handleSwapDemo}
          loading={loading === "swap"}
        />
      </View>
      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
}

// ─── Shared Components ───

function Btn({
  title,
  onPress,
  loading,
  color,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: color ?? "#2563eb", opacity: pressed ? 0.7 : 1 },
        loading && styles.btnDisabled,
      ]}
    >
      <Text style={styles.btnText}>{loading ? "..." : title}</Text>
    </Pressable>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  h2: { fontSize: 17, fontWeight: "600", marginBottom: 10 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888",
    marginBottom: 4,
    marginTop: 8,
  },
  muted: { color: "#888", marginTop: 8 },
  error: { color: "#cc3333", marginTop: 8 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: { color: "#666", fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: "500", maxWidth: "60%" },
  btnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  result: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "monospace",
  },
});
