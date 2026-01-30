import {
  SolanaRpcError,
  SolanaRpcErrorCode,
} from "@oko-wallet-sdk-svm/methods/make_signature";

describe("SolanaRpcError", () => {
  it("should create error with code and message", () => {
    const error = new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Internal error",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SolanaRpcError);
    expect(error.code).toBe(SolanaRpcErrorCode.Internal);
    expect(error.message).toBe("Internal error");
    expect(error.name).toBe("SolanaRpcError");
  });

  it("should create user rejected error", () => {
    const error = new SolanaRpcError(
      SolanaRpcErrorCode.UserRejectedRequest,
      "User rejected the request",
    );

    expect(error.code).toBe(4001);
    expect(error.message).toBe("User rejected the request");
  });

  it("should have correct error codes", () => {
    expect(SolanaRpcErrorCode.UserRejectedRequest).toBe(4001);
    expect(SolanaRpcErrorCode.Internal).toBe(-32603);
  });
});
