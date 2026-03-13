import { z } from "zod";

import { ApiKeyHeaderSchema, UserAuthHeaderSchema } from "../common";
import { registry } from "../registry";

const stringArraySchema = z.array(z.string());
const stringPairSchema = z.tuple([z.string(), z.string()]);
const stringPairMatrixSchema = z.array(z.array(stringPairSchema));

export const ApiKeyAndUserAuthHeaderSchema = z.object({
  "x-api-key": ApiKeyHeaderSchema.shape["x-api-key"],
  Authorization: UserAuthHeaderSchema.shape.Authorization,
});

const Wait2ParticipantSchema = registry.register(
  "TssTriplesWait2Participant",
  z.object({
    big_e_i_v: stringArraySchema,
    big_f_i_v: stringArraySchema,
    big_l_i_v: stringArraySchema,
    my_randomizers: stringArraySchema,
    my_phi_proof0v: stringArraySchema,
    my_phi_proof1v: stringArraySchema,
  }),
);

const Wait3ParticipantSchema = registry.register(
  "TssTriplesWait3Participant",
  z.object({
    a_i_j_v: stringArraySchema,
    b_i_j_v: stringArraySchema,
  }),
);

const Wait4ParticipantSchema = registry.register(
  "TssTriplesWait4Participant",
  z.object({
    big_c_i_points: stringArraySchema,
    my_phi_proofs: stringArraySchema,
  }),
);

const Wait5ParticipantSchema = registry.register(
  "TssTriplesWait5Participant",
  z.object({
    hat_big_c_i_points: stringArraySchema,
    my_phi_proofs: stringArraySchema,
  }),
);

const Wait6ParticipantSchema = registry.register(
  "TssTriplesWait6Participant",
  z.object({
    c_i_j_v: stringArraySchema,
  }),
);

const TriplesMessagesSchema = registry.register(
  "TssTriplesMessages",
  z.object({
    wait_0: z
      .record(z.string(), stringArraySchema)
      .openapi({ description: "Participant -> wait_0 payload" }),
    wait_1: z
      .record(z.string(), stringArraySchema)
      .openapi({ description: "Participant -> wait_1 payload" }),
    wait_2: z
      .record(z.string(), Wait2ParticipantSchema)
      .openapi({ description: "Participant -> wait_2 payload" }),
    wait_3: z
      .record(z.string(), Wait3ParticipantSchema)
      .openapi({ description: "Participant -> wait_3 payload" }),
    wait_4: z
      .record(z.string(), Wait4ParticipantSchema)
      .openapi({ description: "Participant -> wait_4 payload" }),
    wait_5: z
      .record(z.string(), Wait5ParticipantSchema)
      .openapi({ description: "Participant -> wait_5 payload" }),
    wait_6: z
      .record(z.string(), Wait6ParticipantSchema)
      .openapi({ description: "Participant -> wait_6 payload" }),
    batch_random_ot_wait_0: z
      .record(z.string(), z.array(z.array(z.string())))
      .openapi({ description: "Participant -> batch random OT payload" }),
    correlated_ot_wait_0: z
      .record(z.string(), stringArraySchema)
      .openapi({ description: "Participant -> correlated OT payload" }),
    random_ot_extension_wait_0: z
      .record(z.string(), stringArraySchema)
      .openapi({ description: "Participant -> random OT extension wait_0" }),
    random_ot_extension_wait_1: z
      .record(
        z.string(),
        z.array(
          z
            .tuple([z.string(), stringArraySchema])
            .openapi({ description: "Random OT extension tuple" }),
        ),
      )
      .openapi({ description: "Participant -> random OT extension wait_1" }),
    mta_wait_0: z
      .record(
        z.string(),
        z
          .object({
            c1_v: stringPairMatrixSchema,
            c2_v: stringPairMatrixSchema,
          })
          .openapi({ description: "MTA step 0 payload" }),
      )
      .openapi({ description: "Participant -> MTA wait_0 payload" }),
    mta_wait_1: z
      .record(
        z.string(),
        z
          .object({
            chi1_seed_1_v: z.array(stringPairSchema),
            chi1_seed_2_v: z.array(stringPairSchema),
          })
          .openapi({ description: "MTA step 1 payload" }),
      )
      .openapi({ description: "Participant -> MTA wait_1 payload" }),
  }),
);

export const TriplesStep1RequestSchema = registry.register(
  "TssTriplesStep1Request",
  z.object({
    msgs_1: TriplesMessagesSchema.openapi({
      description: "Incoming triples messages from client",
    }),
  }),
);

const TriplesStep1ResponseSchema = registry.register(
  "TssTriplesStep1Response",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    msgs_0: TriplesMessagesSchema.openapi({
      description: "Server generated triples messages",
    }),
  }),
);

export const TriplesStep1SuccessResponseSchema = registry.register(
  "TssTriplesStep1SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep1ResponseSchema,
  }),
);

const TriplesStep2ResponseSchema = registry.register(
  "TssTriplesStep2Response",
  z.object({
    wait_1: stringArraySchema.openapi({
      description: "Updated wait_1 payload",
    }),
  }),
);

export const TriplesStep2RequestSchema = registry.register(
  "TssTriplesStep2Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    wait_1: stringArraySchema.openapi({
      description: "Incoming wait_1 payload",
    }),
  }),
);

export const TriplesStep2SuccessResponseSchema = registry.register(
  "TssTriplesStep2SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep2ResponseSchema,
  }),
);

const Wait2RecordSchema = registry.register(
  "TssTriplesWait2Record",
  z
    .record(z.string(), Wait2ParticipantSchema)
    .openapi({ description: "Participant -> wait_2 payload" }),
);

export const TriplesStep3RequestSchema = registry.register(
  "TssTriplesStep3Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    wait_2: Wait2RecordSchema,
  }),
);

const TriplesStep3ResponseSchema = registry.register(
  "TssTriplesStep3Response",
  z.object({
    wait_2: Wait2RecordSchema.openapi({
      description: "Updated wait_2 payload",
    }),
  }),
);

export const TriplesStep3SuccessResponseSchema = registry.register(
  "TssTriplesStep3SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep3ResponseSchema,
  }),
);

const Wait3RecordSchema = registry.register(
  "TssTriplesWait3Record",
  z
    .record(z.string(), Wait3ParticipantSchema)
    .openapi({ description: "Participant -> wait_3 payload" }),
);

export const TriplesStep4RequestSchema = registry.register(
  "TssTriplesStep4Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    wait_3: Wait3RecordSchema,
  }),
);

const TriplesStep4ResponseSchema = registry.register(
  "TssTriplesStep4Response",
  z.object({
    wait_3: Wait3RecordSchema.openapi({
      description: "Updated wait_3 payload",
    }),
  }),
);

export const TriplesStep4SuccessResponseSchema = registry.register(
  "TssTriplesStep4SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep4ResponseSchema,
  }),
);

const Wait4RecordSchema = registry.register(
  "TssTriplesWait4Record",
  z
    .record(z.string(), Wait4ParticipantSchema)
    .openapi({ description: "Participant -> wait_4 payload" }),
);

export const TriplesStep5RequestSchema = registry.register(
  "TssTriplesStep5Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    wait_4: Wait4RecordSchema,
  }),
);

const TriplesStep5ResponseSchema = registry.register(
  "TssTriplesStep5Response",
  z.object({
    wait_4: Wait4RecordSchema.openapi({
      description: "Updated wait_4 payload",
    }),
  }),
);

export const TriplesStep5SuccessResponseSchema = registry.register(
  "TssTriplesStep5SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep5ResponseSchema,
  }),
);

const BatchRandomOtWaitSchema = registry.register(
  "TssTriplesBatchRandomOtWait",
  z
    .record(z.string(), z.array(z.array(z.string())))
    .openapi({ description: "Participant -> batch random OT payload" }),
);

export const TriplesStep6RequestSchema = registry.register(
  "TssTriplesStep6Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    batch_random_ot_wait_0: BatchRandomOtWaitSchema,
  }),
);

const TriplesStep6ResponseSchema = registry.register(
  "TssTriplesStep6Response",
  z.object({
    batch_random_ot_wait_0: BatchRandomOtWaitSchema.openapi({
      description: "Updated batch random OT payload",
    }),
  }),
);

export const TriplesStep6SuccessResponseSchema = registry.register(
  "TssTriplesStep6SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep6ResponseSchema,
  }),
);

export const TriplesStep7RequestSchema = registry.register(
  "TssTriplesStep7Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    correlated_ot_wait_0: stringArraySchema.openapi({
      description: "Incoming correlated OT payload",
    }),
  }),
);

const TriplesStep7ResponseSchema = registry.register(
  "TssTriplesStep7Response",
  z.object({
    random_ot_extension_wait_0: stringArraySchema.openapi({
      description: "Random OT extension wait_0 payload",
    }),
  }),
);

export const TriplesStep7SuccessResponseSchema = registry.register(
  "TssTriplesStep7SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep7ResponseSchema,
  }),
);

const RandomOtExtensionWait1Schema = registry.register(
  "TssTriplesRandomOtExtensionWait1",
  z
    .record(
      z.string(),
      z.array(
        z.tuple([z.string(), stringArraySchema]).openapi({
          description: "Random OT extension tuple",
        }),
      ),
    )
    .openapi({ description: "Participant -> random OT extension wait_1" }),
);

export const TriplesStep8RequestSchema = registry.register(
  "TssTriplesStep8Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    random_ot_extension_wait_1: RandomOtExtensionWait1Schema,
  }),
);

const MtaWait0RecordSchema = registry.register(
  "TssTriplesMtaWait0Record",
  z
    .record(
      z.string(),
      z.object({
        c1_v: stringPairMatrixSchema,
        c2_v: stringPairMatrixSchema,
      }),
    )
    .openapi({ description: "Participant -> MTA wait_0 payload" }),
);

const TriplesStep8ResponseSchema = registry.register(
  "TssTriplesStep8Response",
  z.object({
    mta_wait_0: MtaWait0RecordSchema,
  }),
);

export const TriplesStep8SuccessResponseSchema = registry.register(
  "TssTriplesStep8SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep8ResponseSchema,
  }),
);

const MtaWait1RecordSchema = registry.register(
  "TssTriplesMtaWait1Record",
  z
    .record(
      z.string(),
      z.object({
        chi1_seed_1_v: z.array(stringPairSchema),
        chi1_seed_2_v: z.array(stringPairSchema),
      }),
    )
    .openapi({ description: "Participant -> MTA wait_1 payload" }),
);

export const TriplesStep9RequestSchema = registry.register(
  "TssTriplesStep9Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    mta_wait_1: MtaWait1RecordSchema,
  }),
);

const TriplesStep9ResponseSchema = registry.register(
  "TssTriplesStep9Response",
  z.object({
    is_success: z.boolean().openapi({
      description: "Indicates if triples generation progressed successfully",
    }),
  }),
);

export const TriplesStep9SuccessResponseSchema = registry.register(
  "TssTriplesStep9SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep9ResponseSchema,
  }),
);

const Wait5RecordSchema = registry.register(
  "TssTriplesWait5Record",
  z
    .record(z.string(), Wait5ParticipantSchema)
    .openapi({ description: "Participant -> wait_5 payload" }),
);

const Wait6RecordSchema = registry.register(
  "TssTriplesWait6Record",
  z
    .record(z.string(), Wait6ParticipantSchema)
    .openapi({ description: "Participant -> wait_6 payload" }),
);

export const TriplesStep10RequestSchema = registry.register(
  "TssTriplesStep10Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    wait_5: Wait5RecordSchema,
    wait_6: Wait6RecordSchema,
  }),
);

const TriplesStep10ResponseSchema = registry.register(
  "TssTriplesStep10Response",
  z.object({
    wait_5: Wait5RecordSchema.openapi({
      description: "Updated wait_5 payload",
    }),
    wait_6: Wait6RecordSchema.openapi({
      description: "Updated wait_6 payload",
    }),
  }),
);

export const TriplesStep10SuccessResponseSchema = registry.register(
  "TssTriplesStep10SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep10ResponseSchema,
  }),
);

const TriplePubSchema = registry.register(
  "TssTriplesPub",
  z.object({
    big_a: z.string().openapi({ description: "Triple public A component" }),
    big_b: z.string().openapi({ description: "Triple public B component" }),
    big_c: z.string().openapi({ description: "Triple public C component" }),
    participants: z
      .array(z.number())
      .openapi({ description: "Participants contributing to triple" }),
    threshold: z.number().openapi({
      description: "Participant threshold for the triple",
    }),
  }),
);

export const TriplesStep11RequestSchema = registry.register(
  "TssTriplesStep11Request",
  z.object({
    session_id: z.string().openapi({
      description: "TSS session identifier",
    }),
    pub_v: z
      .array(TriplePubSchema)
      .openapi({ description: "Generated public triples" }),
  }),
);

const TriplesStep11ResponseSchema = registry.register(
  "TssTriplesStep11Response",
  z.object({
    pub_v: z
      .array(TriplePubSchema)
      .openapi({ description: "Finalized triple publications" }),
  }),
);

export const TriplesStep11SuccessResponseSchema = registry.register(
  "TssTriplesStep11SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TriplesStep11ResponseSchema,
  }),
);
