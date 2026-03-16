export interface KeyShareNodeMeta {
  sss_threshold: number;
  registration_threshold: number | null;
}

export type InsertKeyShareNodeMetaRequest = KeyShareNodeMeta;
