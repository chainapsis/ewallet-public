export type CreateOrEditKSNodeProps =
  | {
      mode?: "create";
      nodeId?: undefined;
    }
  | {
      mode: "edit";
      nodeId: string;
    };
