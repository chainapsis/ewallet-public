import { CreateKSNode } from "@oko-wallet-admin/components/create_ks_node/create_ks_node";

export default async function Page({ params }: { params: Params }) {
  const pr = await params;

  return <CreateKSNode mode="edit" nodeId={pr.node_id} />;
}

type Params = Promise<{
  node_id: string;
}>;
