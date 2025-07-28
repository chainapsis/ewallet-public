export const commonSchemas = {
  SuccessResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        enum: [true],
      },
      data: {
        type: "object",
        description: "Response data",
      },
    },
  },
  ErrorResponse: {
    type: "object",
    required: ["success", "code", "msg"],
    properties: {
      success: {
        type: "boolean",
        enum: [false],
      },
      code: {
        type: "string",
        description: "Error code",
      },
      msg: {
        type: "string",
        description: "Error message",
      },
    },
  },
};
