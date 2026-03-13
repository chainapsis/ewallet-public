import { WasmExample } from "../components/wasm_example/wasm_example";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <WasmExample />
    </div>
  );
}
