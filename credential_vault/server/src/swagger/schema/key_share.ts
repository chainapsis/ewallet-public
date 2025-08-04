export const keyShareSchemas = {
  RegisterKeyShareBody: {
    type: "object",
    required: ["curve_type", "public_key", "enc_share"],
    properties: {
      curve_type: {
        type: "string",
        enum: ["secp256k1"],
        description: "The curve type for the key share",
      },
      public_key: {
        type: "string",
        description: "Public key in hex string format",
        example: "3fa1c7e8b42d9f50c6e2a8749db1fe23",
      },
      enc_share: {
        type: "string",
        description: "Encrypted key share in hex string format",
        example: "8c5e2d17ab9034f65d1c3b7a29ef4d88",
      },
    },
  },
  GetKeyShareRequestBody: {
    type: "object",
    required: ["public_key"],
    properties: {
      public_key: {
        type: "string",
        description: "Public key in hex string format",
        example: "3fa1c7e8b42d9f50c6e2a8749db1fe23",
      },
    },
  },
  GetKeyShareResponse: {
    type: "object",
    required: ["share_id", "enc_share"],
    properties: {
      share_id: {
        type: "string",
        format: "uuid",
        description: "Unique identifier for the key share",
      },
      enc_share: {
        type: "string",
        description: "Encrypted key share in hex string format",
        example: "8c5e2d17ab9034f65d1c3b7a29ef4d88",
      },
    },
  },
  CheckKeyShareRequestBody: {
    type: "object",
    required: ["email", "public_key"],
    properties: {
      email: {
        type: "string",
        description: "Email address",
        example: "test@example.com",
      },
      public_key: {
        type: "string",
        description: "Public key in hex string format",
        example: "3fa1c7e8b42d9f50c6e2a8749db1fe23",
      },
    },
  },
  CheckKeyShareResponse: {
    type: "object",
    required: ["is_exists"],
    properties: {
      is_exists: {
        type: "boolean",
        description: "Whether the key share exists",
      },
    },
  },
};
