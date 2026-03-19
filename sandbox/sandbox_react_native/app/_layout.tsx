import { OkoWalletProvider } from "@oko-wallet/oko-sdk-core-react-native";
import { Stack } from "expo-router";

const API_KEY =
  "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c";
const SDK_ENDPOINT = process.env.EXPO_PUBLIC_OKO_SDK_ENDPOINT;

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
