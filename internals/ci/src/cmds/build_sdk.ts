import { buildInStages } from "@oko-wallet-ci/build";
import { paths } from "@oko-wallet-ci/paths";

export async function buildSDK(..._args: any[]) {
  await doBuildSDK();
}

export async function doBuildSDK() {
  const stages = [
    [paths.sdk_core],
    [
      paths.sdk_cosmos,
      paths.sdk_eth,
      paths.sdk_svm,
      paths.sdk_core_react_native,
    ],
    [paths.sdk_cosmos_kit, paths.sdk_react],
  ];

  await buildInStages(stages, 4);
}
