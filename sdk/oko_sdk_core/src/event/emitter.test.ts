import { jest } from "@jest/globals";

import { EventEmitter3 } from "./emitter";

type TestEvent =
  | {
      type: "userLogin";
      userId: string;
      email: string;
    }
  | {
      type: "userLogout";
      userId: string;
    }
  | {
      type: "dataUpdate";
      data: any;
    };

type TestEventHandler =
  | {
      type: "userLogin";
      handler: (payload: { userId: string; email: string }) => void;
    }
  | {
      type: "userLogout";
      handler: (payload: { userId: string }) => void;
    }
  | {
      type: "dataUpdate";
      handler: (payload: any) => void;
    };

describe("EventEmitter2", () => {
  let emitter: EventEmitter3<TestEvent, TestEventHandler>;

  beforeEach(() => {
    emitter = new EventEmitter3<TestEvent, TestEventHandler>();
  });

  describe("Basic event registration and emission", () => {
    test("should register and call handlers correctly", () => {
      const mockHandler = jest.fn();

      emitter.on({ type: "userLogin", handler: mockHandler });
      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith({
        userId: "123",
        email: "test@example.com",
      });
    });

    test("should register multiple handlers for the same event and call all of them", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on({ type: "userLogin", handler: handler1 });
      emitter.on({ type: "userLogin", handler: handler2 });
      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test("should handle different event types independently", () => {
      const loginHandler = jest.fn();
      const logoutHandler = jest.fn();

      emitter.on({ type: "userLogin", handler: loginHandler });
      emitter.on({ type: "userLogout", handler: logoutHandler });

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });
      emitter.emit({ type: "userLogout", userId: "123" });

      expect(loginHandler).toHaveBeenCalledTimes(1);
      expect(logoutHandler).toHaveBeenCalledTimes(1);
    });

    test("should not throw error when emitting events with no registered handlers", () => {
      expect(() => {
        emitter.emit({
          type: "userLogin",
          userId: "123",
          email: "test@example.com",
        });
      }).not.toThrow();
    });
  });

  describe("Handler removal functionality (off)", () => {
    test("should remove specific handler correctly", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on({ type: "userLogin", handler: handler1 });
      emitter.on({ type: "userLogin", handler: handler2 });

      emitter.off({ type: "userLogin", handler: handler1 });

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test("should delete event key from listeners when all handlers are removed", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on({ type: "userLogin", handler: handler1 });
      emitter.on({ type: "userLogin", handler: handler2 });

      expect(emitter.listeners.userLogin).toBeDefined();
      expect(emitter.listeners.userLogin?.length).toBe(2);

      emitter.off({ type: "userLogin", handler: handler1 });
      expect(emitter.listeners.userLogin?.length).toBe(1);

      emitter.off({ type: "userLogin", handler: handler2 });
      expect(emitter.listeners.userLogin).toBeUndefined();
    });

    test("should not affect handlers of other events", () => {
      const loginHandler = jest.fn();
      const logoutHandler = jest.fn();

      emitter.on({ type: "userLogin", handler: loginHandler });
      emitter.on({ type: "userLogout", handler: logoutHandler });

      emitter.off({ type: "userLogin", handler: loginHandler });

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });
      emitter.emit({ type: "userLogout", userId: "123" });

      expect(loginHandler).not.toHaveBeenCalled();
      expect(logoutHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Same function reference handling", () => {
    test("should manage each registration independently when same function is registered multiple times", () => {
      const handler = jest.fn();

      emitter.on({ type: "userLogin", handler: handler });
      emitter.on({ type: "userLogin", handler: handler });
      emitter.on({ type: "userLogin", handler: handler });

      expect(emitter.listeners.userLogin?.length).toBe(3);

      emitter.off({ type: "userLogin", handler: handler });
      expect(emitter.listeners.userLogin?.length).toBe(2);

      emitter.off({ type: "userLogin", handler: handler });
      expect(emitter.listeners.userLogin?.length).toBe(1);

      emitter.off({ type: "userLogin", handler: handler });
      expect(emitter.listeners.userLogin).toBeUndefined();
    });

    test("should call remaining handlers correctly after partial removal of same function", () => {
      const handler = jest.fn();

      emitter.on({ type: "userLogin", handler: handler });
      emitter.on({ type: "userLogin", handler: handler });

      emitter.off({ type: "userLogin", handler: handler });

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Memory leak prevention", () => {
    test("should completely remove references after handler removal", () => {
      const handler = jest.fn();

      emitter.on({ type: "userLogin", handler });
      expect(emitter.listeners.userLogin).toBeDefined();

      emitter.off({ type: "userLogin", handler });
      expect(emitter.listeners.userLogin).toBeUndefined();

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });
      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle large number of handler registrations/removals correctly", () => {
      const handlers: jest.Mock[] = [];

      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        emitter.on({ type: "userLogin", handler });
      }

      expect(emitter.listeners.userLogin?.length).toBe(100);

      for (let i = 0; i < 50; i++) {
        emitter.off({ type: "userLogin", handler: handlers[i] });
      }

      expect(emitter.listeners.userLogin?.length).toBe(50);

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });

      for (let i = 0; i < 50; i++) {
        expect(handlers[i]).not.toHaveBeenCalled();
      }
      for (let i = 50; i < 100; i++) {
        expect(handlers[i]).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("Edge cases and error scenarios", () => {
    test("should throw error when handler throws and stop execution", () => {
      const errorMessage = "Intentional error for testing";

      const errorHandler = jest.fn(() => {
        throw new Error(errorMessage);
      });

      const normalHandler = jest.fn();

      // call order: errorHandler -> normalHandler
      emitter.on({ type: "userLogin", handler: errorHandler });
      emitter.on({ type: "userLogin", handler: normalHandler });

      expect(() => {
        emitter.emit({
          type: "userLogin",
          userId: "123",
          email: "test@example.com",
        });
      }).toThrow(errorMessage);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).not.toHaveBeenCalled();
    });

    test("should reject null/undefined handlers during registration", () => {
      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.on("userLogin", null)).toThrow(
        'The "handler" argument must be of type function. Received null',
      );

      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.on("userLogin", undefined)).toThrow(
        'The "handler" argument must be of type function. Received undefined',
      );

      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.off("userLogin", null)).not.toThrow();
      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.off("userLogin", undefined)).not.toThrow();
    });

    test("should reject non-function handlers during registration", () => {
      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.on("userLogin", "not a function")).toThrow(
        'The "handler" argument must be of type function. Received string',
      );

      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.on("userLogin", 123)).toThrow(
        'The "handler" argument must be of type function. Received number',
      );

      // @ts-expect-error - intentionally testing with invalid input
      expect(() => emitter.on("userLogin", {})).toThrow(
        'The "handler" argument must be of type function. Received object',
      );
    });

    test("should maintain handler execution order", () => {
      const executionOrder: number[] = [];
      const handler1 = jest.fn(() => executionOrder.push(1));
      const handler2 = jest.fn(() => executionOrder.push(2));
      const handler3 = jest.fn(() => executionOrder.push(3));

      emitter.on({ type: "userLogin", handler: handler1 });
      emitter.on({ type: "userLogin", handler: handler2 });
      emitter.on({ type: "userLogin", handler: handler3 });

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    test("should handle rapid registration and removal", () => {
      const handler = jest.fn();

      for (let i = 0; i < 10; i++) {
        emitter.on({ type: "userLogin", handler });
        emitter.off({ type: "userLogin", handler });
      }

      expect(emitter.listeners.userLogin).toBeUndefined();

      emitter.emit({
        type: "userLogin",
        userId: "123",
        email: "test@example.com",
      });
      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle modification of listeners during event emission", () => {
      const assassin = jest.fn();
      const handler1 = jest.fn();
      const handler2 = jest.fn(() => {
        // this handler will replace handler3 with assassin...
        emitter.off({ type: "userLogin", handler: handler3 });
        emitter.on({ type: "userLogin", handler: assassin });
      });
      const handler3 = jest.fn();

      emitter.on({ type: "userLogin", handler: handler1 });
      emitter.on({ type: "userLogin", handler: handler2 });
      emitter.on({ type: "userLogin", handler: handler3 });

      expect(() => {
        emitter.emit({
          type: "userLogin",
          userId: "123",
          email: "test@example.com",
        });
      }).not.toThrow();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(0);
      expect(assassin).toHaveBeenCalledTimes(1);
    });
  });
});
