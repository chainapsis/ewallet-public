import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const paths = (function () {
  const root = path.join(__dirname, "../../../");

  const ksn_interface = path.join(
    __dirname,
    "../../../key_share_node/ksn_interface/",
  );

  const ksn_server = path.join(__dirname, "../../../key_share_node/server");

  const ksn_pg_interface = path.join(
    __dirname,
    "../../../key_share_node/pg_interface/",
  );

  const dotenv = path.join(__dirname, "../../../lib/dotenv");

  const stdlib = path.join(__dirname, "../../../lib/stdlib_js");

  const oko_types = path.join(__dirname, "../../../common/oko_types/");

  const sdk_cosmos_kit = path.join(__dirname, "../../../sdk/oko_cosmos_kit/");

  const sdk_core = path.join(__dirname, "../../../sdk/oko_sdk_core/");

  const sdk_svm = path.join(__dirname, "../../../sdk/oko_sdk_svm/");

  const sdk_eth = path.join(__dirname, "../../../sdk/oko_sdk_eth/");

  const sdk_cosmos = path.join(__dirname, "../../../sdk/oko_sdk_cosmos/");

  const sandbox_simple_host = path.join(
    __dirname,
    "../../../sandbox/sandbox_simple_host/",
  );

  const sandbox_sol = path.join(__dirname, "../../../sandbox/sandbox_sol/");

  const crypto_bytes = path.join(__dirname, "../../../crypto/bytes/");

  const crypto_js = path.join(__dirname, "../../../crypto/crypto_js/");

  const tecdsa_interface = path.join(
    __dirname,
    "../../../crypto/tecdsa/tecdsa_interface/",
  );

  const teddsa_interface = path.join(
    __dirname,
    "../../../crypto/teddsa/teddsa_interface/",
  );

  // internals2
  const cait_sith_addon_addon = path.join(
    __dirname,
    "../../../crypto/tecdsa/cait_sith_keplr_addon/addon",
  );

  const cait_sith_keplr_wasm = path.join(
    __dirname,
    "../../../crypto/tecdsa/cait_sith_keplr_wasm",
  );

  const frost_keplr_wasm = path.join(
    __dirname,
    "../../../crypto/teddsa/frost_ed25519_keplr_wasm",
  );

  const teddsa_addon_addon = path.join(
    __dirname,
    "../../../crypto/teddsa/teddsa_addon/addon",
  );

  const oko_pg_interface = path.join(
    __dirname,
    "../../../backend/oko_pg_interface",
  );

  const oko_attached = path.join(__dirname, "../../../embed/oko_attached");

  const oko_admin_web = path.join(__dirname, "../../../apps/oko_admin_web/");

  const demo_web = path.join(__dirname, "../../../apps/demo_web");

  const user_dashboard = path.join(__dirname, "../../../apps/user_dashboard/");

  const ct_dashboard_web = path.join(
    __dirname,
    "../../../apps/customer_dashboard",
  );

  const oko_api_server = path.join(
    __dirname,
    "../../../backend/oko_api/server",
  );

  const admin_api = path.join(__dirname, "../../../backend/admin_api");

  const ct_dashboard_api = path.join(
    __dirname,
    "../../../backend/ct_dashboard_api",
  );

  const dockerfiles = path.join(__dirname, "../../docker");

  const dockerfiles_oko = path.join(__dirname, "../../docker/oko");

  const example_cosmos_nextjs = path.join(
    __dirname,
    "../../../examples/cosmos_nextjs",
  );

  const example_cosmoskit_nextjs = path.join(
    __dirname,
    "../../../examples/cosmoskit_nextjs",
  );

  const example_evm_nextjs = path.join(
    __dirname,
    "../../../examples/evm_nextjs",
  );

  const example_evm_wagmi_nextjs = path.join(
    __dirname,
    "../../../examples/evm_wagmi_nextjs",
  );

  const example_multi_ecosystem_react = path.join(
    __dirname,
    "../../../examples/cosmos_nextjs",
  );

  return {
    root,
    stdlib,
    dotenv,
    example_cosmoskit_nextjs,
    example_cosmos_nextjs,
    example_evm_nextjs,
    example_evm_wagmi_nextjs,
    example_multi_ecosystem_react,
    oko_types,
    sdk_core,
    sdk_eth,
    sdk_cosmos_kit,
    sdk_cosmos,
    sdk_svm,
    crypto_bytes,
    crypto_js,
    ksn_interface,
    ksn_server,
    ksn_pg_interface,
    sandbox_simple_host,
    sandbox_sol,
    tecdsa_interface,
    teddsa_interface,
    oko_pg_interface,
    oko_attached,
    oko_admin_web,
    cait_sith_keplr_wasm,
    cait_sith_addon_addon,
    frost_keplr_wasm,
    teddsa_addon_addon,
    demo_web,
    user_dashboard,
    ct_dashboard_web,
    oko_api_server,
    admin_api,
    ct_dashboard_api,
    dockerfiles,
    dockerfiles_oko,
  };
})();
