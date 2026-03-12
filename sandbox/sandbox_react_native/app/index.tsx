import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";
import type { OkoWalletRN } from "@oko-wallet/oko-sdk-core-react-native";
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import type { OkoWalletInterface } from "@oko-wallet/oko-sdk-core";

// ─── Config ───

const COSMOS_CHAIN_ID = "cosmoshub-4";

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
    async (type: "google" | "x" | "discord" | "github" | "email") => {
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

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Cosmos ({COSMOS_CHAIN_ID})</Text>
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

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Ethereum</Text>
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
