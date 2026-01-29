import { z } from "zod";

import { registry } from "../registry";
import { CommitRevealRequestFieldsSchema } from "./commit_reveal";

const OAuthTypeSchema = z.enum(["google", "auth0"]).openapi({
  description: "OAuth provider type",
  example: "google",
});

export const SignInRequestSchema = registry.register(
  "TssUserSignInRequest",
  z
    .object({
      auth_type: OAuthTypeSchema.optional(),
    })
    .merge(CommitRevealRequestFieldsSchema),
);

export const KeygenRequestSchema = registry.register(
  "TssKeygenRequest",
  z.object({
    auth_type: OAuthTypeSchema,
    keygen_2: z
      .object({
        private_share: z.string().openapi({
          description: "Private key share for TSS",
        }),
        public_key: z.string().openapi({
          description: "Public key in hex format",
        }),
      })
      .openapi({
        description: "Keygen stage 2 payload",
      }),
  }),
);

export const ReshareRequestSchema = registry.register(
  "TssUserReshareRequest",
  z.object({
    auth_type: OAuthTypeSchema,
    public_key: z.string().openapi({
      description: "Wallet public key in hex format",
    }),
    reshared_key_shares: z
      .array(
        z.object({
          name: z.string().openapi({
            description: "Key share node name",
          }),
          endpoint: z.string().openapi({
            description: "Key share node endpoint",
          }),
        }),
      )
      .openapi({ description: "Reshared key shares grouped by node" }),
  }),
);

// V2: Combined keygen for both secp256k1 and ed25519
const TeddsaKeygenOutputSchema = z.object({
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
});

export const KeygenRequestV2Schema = registry.register(
  "TssKeygenRequestV2",
  z
    .object({
      keygen_2_secp256k1: z
        .object({
          private_share: z.string().openapi({
            description: "Private key share for secp256k1 TSS",
          }),
          public_key: z.string().openapi({
            description: "secp256k1 public key in hex format",
          }),
        })
        .openapi({
          description: "Keygen stage 2 payload for secp256k1",
        }),
      keygen_2_ed25519: TeddsaKeygenOutputSchema.openapi({
        description: "Server's keygen output for ed25519",
      }),
    })
    .merge(CommitRevealRequestFieldsSchema),
);

const ReshareWalletInfoSchema = z.object({
  public_key: z.string().openapi({
    description: "Wallet public key in hex format",
  }),
  reshared_key_shares: z
    .array(
      z.object({
        name: z.string().openapi({
          description: "Key share node name",
        }),
        endpoint: z.string().openapi({
          description: "Key share node endpoint",
        }),
      }),
    )
    .openapi({ description: "Reshared key shares for this wallet" }),
});

export const ReshareRequestV2Schema = registry.register(
  "TssUserReshareRequestV2",
  z
    .object({
      wallets: z
        .object({
          secp256k1: ReshareWalletInfoSchema.openapi({
            description: "secp256k1 wallet reshare info",
          }).optional(),
          ed25519: ReshareWalletInfoSchema.openapi({
            description: "ed25519 wallet reshare info",
          }).optional(),
        })
        .refine((data) => data.secp256k1 || data.ed25519, {
          message: "At least one of secp256k1 or ed25519 must be provided",
        })
        .openapi({
          description: "Wallet reshare info per curve type",
        }),
    })
    .merge(CommitRevealRequestFieldsSchema),
);
