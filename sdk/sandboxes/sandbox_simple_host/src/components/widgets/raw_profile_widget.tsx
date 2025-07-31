import { Widget } from "./widget_components";
// import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";

export const RawProfileWidget: React.FC<LoginWidgetProps> = ({}) => {
  // const { eWallet, isAuthenticated, setIsAuthenticated } = useKeplrEwallet();
  // const handleGoogleSignIn = async () => {
  //   if (eWallet) {
  //     try {
  //       await eWallet.signIn("google");
  //       console.log("sign in success");
  //       setIsAuthenticated(true);
  //     } catch (error) {
  //       console.error("Sign in failed:", error);
  //     }
  //   }
  // };
  //
  // const handleSignOut = async () => {
  //   if (eWallet) {
  //     await eWallet.signOut();
  //     setIsAuthenticated(false);
  //   }
  // };

  return <Widget>raw profile</Widget>;
};

export interface LoginWidgetProps {}
