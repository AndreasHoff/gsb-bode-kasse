import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment } from "../../types/domain";

// Hoist all mocks
const mocks = vi.hoisted(() => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockBatch,
    mockDoc: vi.fn(() => ({ id: `mock-${Math.random().toString(36).slice(2)}` })),
    mockGetDoc: vi.fn(),
    mockWriteBatch: vi.fn(() => mockBatch),
    paymentDocMock: vi.fn((teamId: string, paymentId: string) => ({ teamId, paymentId })),
    activityLogColMock: vi.fn((teamId: string) => ({ teamId })),
  };
});

// Mock Firestore
vi.mock("firebase/firestore", () => ({
  writeBatch: mocks.mockWriteBatch,
  doc: mocks.mockDoc,
  getDoc: mocks.mockGetDoc,
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("./refs", () => ({
  paymentDoc: mocks.paymentDocMock,
  activityLogCol: mocks.activityLogColMock,
}));

// Import after mocks are set up
import { initiatePayment, approvePayment, disputePayment } from "./payments";

const basePayment: Payment = {
  id: "payment-1",
  fineId: "fine-1",
  userId: "user-1",
  amount: 50,
  status: "unpaid",
};

describe("initiatePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions an unpaid payment to pending and writes an activity log", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => basePayment,
    });

    const result = await initiatePayment("team-1", "payment-1", "user-1");

    expect(result.status).toBe("pending");
    expect(result.initiatedAt).toBeDefined();

    // Batch should write the updated payment and a log entry
    expect(mocks.mockBatch.set).toHaveBeenCalledTimes(2);
    expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();

    // First set call should be the payment update
    const [paymentRef, paymentData] = mocks.mockBatch.set.mock.calls[0] as [unknown, Payment];
    expect(paymentRef).toEqual({ teamId: "team-1", paymentId: "payment-1" });
    expect(paymentData.status).toBe("pending");
    expect(paymentData.initiatedAt).toBeDefined();

    // Second set call should be the activity log entry
    const [, logData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(logData.action).toBe("payment.initiated");
    expect(logData.entityType).toBe("payment");
    expect(logData.entityId).toBe("payment-1");
    expect(logData.actorId).toBe("user-1");
  });

  it("throws when the payment does not exist", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(initiatePayment("team-1", "missing-payment", "user-1")).rejects.toThrow(
      "Payment missing-payment not found in team team-1",
    );
  });
});

describe("approvePayment", () => {
  const pendingPayment: Payment = {
    ...basePayment,
    status: "pending",
    initiatedAt: "2026-06-01T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions a pending payment to approved and writes an activity log", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => pendingPayment,
    });

    const result = await approvePayment("team-1", "payment-1", "admin-1");

    expect(result.status).toBe("approved");
    expect(result.approvedAt).toBeDefined();
    expect(result.approvedBy).toBe("admin-1");

    expect(mocks.mockBatch.set).toHaveBeenCalledTimes(2);
    expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();

    const [paymentRef, paymentData] = mocks.mockBatch.set.mock.calls[0] as [unknown, Payment];
    expect(paymentRef).toEqual({ teamId: "team-1", paymentId: "payment-1" });
    expect(paymentData.status).toBe("approved");
    expect(paymentData.approvedBy).toBe("admin-1");

    const [, logData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(logData.action).toBe("payment.approved");
    expect(logData.entityType).toBe("payment");
    expect(logData.entityId).toBe("payment-1");
    expect(logData.actorId).toBe("admin-1");
  });

  it("throws when the payment does not exist", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(approvePayment("team-1", "missing-payment", "admin-1")).rejects.toThrow(
      "Betaling blev ikke fundet",
    );
  });
});

describe("disputePayment", () => {
  const pendingPayment: Payment = {
    ...basePayment,
    status: "pending",
    initiatedAt: "2026-06-01T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions a pending payment to disputed and writes an activity log", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => pendingPayment,
    });

    const result = await disputePayment("team-1", "payment-1", "admin-1");

    expect(result.status).toBe("disputed");

    expect(mocks.mockBatch.set).toHaveBeenCalledTimes(2);
    expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();

    const [paymentRef, paymentData] = mocks.mockBatch.set.mock.calls[0] as [unknown, Payment];
    expect(paymentRef).toEqual({ teamId: "team-1", paymentId: "payment-1" });
    expect(paymentData.status).toBe("disputed");

    const [, logData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(logData.action).toBe("payment.disputed");
    expect(logData.entityType).toBe("payment");
    expect(logData.entityId).toBe("payment-1");
    expect(logData.actorId).toBe("admin-1");
  });

  it("throws when the payment does not exist", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(disputePayment("team-1", "missing-payment", "admin-1")).rejects.toThrow(
      "Betaling blev ikke fundet",
    );
  });
});

describe("Full E2E simulated payment flow", () => {
  /**
   * Simulates the complete flow:
   *   Admin assigns fine → member initiates payment → admin approves.
   *
   * Each step is run sequentially and the Firestore mock is advanced to
   * reflect the state changes that would happen in a real database.
   */
  it("unpaid → pending (initiatePayment) → approved (approvePayment)", async () => {
    vi.clearAllMocks();

    // Step 1: Member initiates payment (unpaid → pending)
    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...basePayment, status: "unpaid" }),
    });

    const pendingResult = await initiatePayment("team-1", "payment-1", "user-1");

    expect(pendingResult.status).toBe("pending");
    expect(pendingResult.initiatedAt).toBeDefined();

    // Verify the activity log was written for payment.initiated
    const initiateLogCall = mocks.mockBatch.set.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(initiateLogCall[1].action).toBe("payment.initiated");

    // Step 2: Admin approves (pending → approved)
    vi.clearAllMocks();

    const pendingPayment: Payment = {
      ...pendingResult,
      status: "pending",
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => pendingPayment,
    });

    const approvedResult = await approvePayment("team-1", "payment-1", "admin-1");

    expect(approvedResult.status).toBe("approved");
    expect(approvedResult.approvedBy).toBe("admin-1");
    expect(approvedResult.approvedAt).toBeDefined();

    // Verify the activity log was written for payment.approved
    const approveLogCall = mocks.mockBatch.set.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(approveLogCall[1].action).toBe("payment.approved");
    expect(approveLogCall[1].metadata).toMatchObject({
      fineIds: ["fine-1"],
      amount: 50,
      userId: "user-1",
    });
  });

  it("unpaid → pending (initiatePayment) → disputed (disputePayment)", async () => {
    vi.clearAllMocks();

    // Step 1: Member initiates payment
    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...basePayment, status: "unpaid" }),
    });

    const pendingResult = await initiatePayment("team-1", "payment-1", "user-1");
    expect(pendingResult.status).toBe("pending");

    // Step 2: Admin disputes (pending → disputed)
    vi.clearAllMocks();

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...pendingResult, status: "pending" }),
    });

    const disputedResult = await disputePayment("team-1", "payment-1", "admin-1");

    expect(disputedResult.status).toBe("disputed");

    const disputeLogCall = mocks.mockBatch.set.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(disputeLogCall[1].action).toBe("payment.disputed");
  });
});
