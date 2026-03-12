import { Stack } from "expo-router";
import { OkoWalletProvider } from "@oko-wallet/oko-sdk-core-react-native";

const API_KEY =
  "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c";

export default function RootLayout() {
  return (
    <OkoWalletProvider
      apiKey={API_KEY}
      sdkEndpoint="https://proxy.damn.it.com"
      redirectScheme="sandboxreactnative"
    >
      <Stack screenOptions={{ headerShown: false }} />
    </OkoWalletProvider>
  );
}
