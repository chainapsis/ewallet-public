import type { FC } from "react";

import { CreateKSNodeForm } from "./create_customer_form";
import styles from "./create_ks_node.module.scss";
import { CreateKSNodeHeader } from "./create_ks_node_header";

export const CreateKSNode: FC<CreateOrEditKSNodeProps> = (props) => {
  const { mode = "create", nodeId } = props;

  return (
    <div className={styles.wrapper}>
      <CreateKSNodeHeader mode={mode} />
      <CreateKSNodeForm mode={mode} nodeId={nodeId} />
    </div>
  );
};
