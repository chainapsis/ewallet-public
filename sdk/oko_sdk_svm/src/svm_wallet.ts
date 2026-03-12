import { OkoSvmWallet } from "./constructor";
import { connect } from "./methods/connect";
import { disconnect } from "./methods/disconnect";
import { sendTransaction } from "./methods/send_transaction";
import { signAllTransactions } from "./methods/sign_all_transactions";
import { signAndSendAllTransactions } from "./methods/sign_and_send_all_transactions";
import { signAndSendTransaction } from "./methods/sign_and_send_transaction";
import { signMessage } from "./methods/sign_message";
import { signTransaction } from "./methods/sign_transaction";
import { init } from "./static/init";
import type { OkoSvmWalletInterface } from "./types";

OkoSvmWallet.init = init;

const ptype: OkoSvmWalletInterface = OkoSvmWallet.prototype;

ptype.connect = connect;
ptype.disconnect = disconnect;
ptype.signTransaction = signTransaction;
ptype.signAllTransactions = signAllTransactions;
ptype.signMessage = signMessage;
ptype.sendTransaction = sendTransaction;
ptype.signAndSendTransaction = signAndSendTransaction;
ptype.signAndSendAllTransactions = signAndSendAllTransactions;

export { OkoSvmWallet };
