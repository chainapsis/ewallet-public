import CosmosTransactionForm from "@/components/CosmosTransactionForm";
import Header from "@/components/Header";
import StatusBar from "@/components/StatusBar";
import { OkoProvider } from "@/oko/OkoProvider";
import EvmTransactionForm from "./components/EvmTransactionForm";
import SvmTransactionForm from "./components/SvmTransactionForm";

function App() {
  return (
    <OkoProvider>
      <div className="max-w-[920px] mx-auto my-10 p-5">
        <Header />
        <StatusBar />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CosmosTransactionForm />
          <EvmTransactionForm />
          <SvmTransactionForm />
        </div>
      </div>
    </OkoProvider>
  );
}

export default App;
