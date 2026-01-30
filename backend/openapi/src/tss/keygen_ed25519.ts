import { z } from "zod";

import { registry } from "../registry";
import { CommitRevealRequestFieldsSchema } from "./commit_reveal";

const TeddsaKeygenOutputSchema = registry.register(
  "TeddsaKeygenOutput",
  z.object({
    key_package: z.array(z.number()).openapi({
      description: "FROST KeyPackage bytes (contains secret share)",
    }),
    public_key_package: z.array(z.number()).openapi({
      description: "Public key package bytes (shared by all participants)",
    }),
    identifier: z
      .array(z.number())
      .openapi({ description: "Participant identifier bytes" }),
    public_key: z
      .array(z.number())
      .openapi({ description: "Ed25519 public key bytes (32 bytes)" }),
  }),
);

export const KeygenEd25519RequestSchema = registry.register(
  "TssKeygenEd25519Request",
  z
    .object({
      keygen_2: TeddsaKeygenOutputSchema.openapi({
        description: "Server's keygen output from centralized key generation",
      }),
    })
    .merge(CommitRevealRequestFieldsSchema),
);
