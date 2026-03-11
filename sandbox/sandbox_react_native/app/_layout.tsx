import { Stack } from "expo-router";
import { OkoWalletProvider } from "@oko-wallet/oko-sdk-core-react-native";

const API_KEY =
  "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c";

// Android emulator: 10.0.2.2, iOS simulator: localhost
// For real device, use your machine's local IP or a deployed proxy
const SDK_ENDPOINT =
  process.env.EXPO_PUBLIC_OKO_SDK_ENDPOINT ?? "http://10.0.2.2:3201";

export default function RootLayout() {
  return (
    <OkoWalletProvider
      apiKey={API_KEY}
      sdkEndpoint={SDK_ENDPOINT}
      redirectScheme="sandboxreactnative"
    >
      <Stack screenOptions={{ headerShown: false }} />
    </OkoWalletProvider>
  );
}
