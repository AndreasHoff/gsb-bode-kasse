import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment, Fine } from "../../types/domain";

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
    getFine: vi.fn(),
    updateUserSeasonBalance: vi.fn(),
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

vi.mock("./fines", () => ({
  getFine: mocks.getFine,
}));

vi.mock("./balances", () => ({
  updateUserSeasonBalance: mocks.updateUserSeasonBalance,
}));

// Import after mocks are set up
import { approvePayment, disputePayment, refundPayment, reconcilePayment } from "./payments";

const baseFine: Fine = {
  id: "fine-1",
  teamId: "team-1",
  seasonId: "season-1",
  title: "For sent",
  amount: 50,
  assignedTo: ["user-1"],
  assignedBy: "admin-1",
  isShared: false,
  createdAt: "2026-08-27T10:00:00.000Z",
};

describe("Payment operations with balance tracking (F024)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFine.mockResolvedValue(baseFine);
  });

  describe("approvePayment", () => {
    const pendingPayment: Payment = {
      id: "payment-1",
      fineIds: ["fine-1"],
      userId: "user-1",
      amount: 50,
      status: "pending",
      initiatedAt: "2026-08-27T10:00:00.000Z",
    };

    it("transitions pending → approved and updates balance", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => pendingPayment,
      });

      const result = await approvePayment("team-1", "payment-1", "admin-1");

      expect(result.status).toBe("approved");
      expect(result.approvedAt).toBeDefined();
      expect(result.approvedBy).toBe("admin-1");

      // Verify balance update was called with correct delta
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { pendingBalance: -50, approvedBalance: 50 },
        "payment.approved",
        "admin-1",
        mocks.mockBatch,
      );

      // Verify batch operations
      expect(mocks.mockBatch.set).toHaveBeenCalledTimes(2); // payment + log
      expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
    });

    it("throws if payment is not pending", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ...pendingPayment, status: "approved" }),
      });

      await expect(approvePayment("team-1", "payment-1", "admin-1")).rejects.toThrow(
        "Kan kun godkende betalinger med status 'pending'",
      );

      expect(mocks.updateUserSeasonBalance).not.toHaveBeenCalled();
    });

    it("throws if payment does not exist", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      await expect(approvePayment("team-1", "payment-1", "admin-1")).rejects.toThrow(
        "Betaling blev ikke fundet",
      );

      expect(mocks.updateUserSeasonBalance).not.toHaveBeenCalled();
    });
  });

  describe("disputePayment", () => {
    const pendingPayment: Payment = {
      id: "payment-1",
      fineIds: ["fine-1"],
      userId: "user-1",
      amount: 50,
      status: "pending",
      initiatedAt: "2026-08-27T10:00:00.000Z",
    };

    it("transitions pending → disputed and updates balance", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => pendingPayment,
      });

      const result = await disputePayment("team-1", "payment-1", "admin-1");

      expect(result.status).toBe("disputed");

      // Verify balance update: pending → outstanding
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { pendingBalance: -50, outstandingBalance: 50 },
        "payment.disputed",
        "admin-1",
        mocks.mockBatch,
      );

      expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
    });

    it("throws if payment is not pending", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ...pendingPayment, status: "approved" }),
      });

      await expect(disputePayment("team-1", "payment-1", "admin-1")).rejects.toThrow(
        "Kan kun afvise betalinger med status 'pending'",
      );

      expect(mocks.updateUserSeasonBalance).not.toHaveBeenCalled();
    });
  });

  describe("refundPayment", () => {
    const approvedPayment: Payment = {
      id: "payment-1",
      fineIds: ["fine-1"],
      userId: "user-1",
      amount: 50,
      status: "approved",
      initiatedAt: "2026-08-27T10:00:00.000Z",
      approvedAt: "2026-08-27T11:00:00.000Z",
      approvedBy: "admin-1",
    };

    it("transitions approved → unpaid and updates balance", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => approvedPayment,
      });

      const result = await refundPayment("team-1", "payment-1", "admin-1");

      expect(result.status).toBe("unpaid");
      expect(result.approvedAt).toBeUndefined();
      expect(result.approvedBy).toBeUndefined();

      // Verify balance update: approved → outstanding
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { approvedBalance: -50, outstandingBalance: 50 },
        "payment.refunded",
        "admin-1",
        mocks.mockBatch,
      );

      expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
    });

    it("throws if payment does not exist", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      await expect(refundPayment("team-1", "payment-1", "admin-1")).rejects.toThrow();

      expect(mocks.updateUserSeasonBalance).not.toHaveBeenCalled();
    });
  });

  describe("reconcilePayment", () => {
    it("transitions unpaid → approved and updates balance (outstanding → approved)", async () => {
      const unpaidPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 50,
        status: "unpaid",
      };

      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => unpaidPayment,
      });

      const result = await reconcilePayment("team-1", "payment-1", "admin-1");

      expect(result.status).toBe("approved");
      expect(result.approvedAt).toBeDefined();
      expect(result.approvedBy).toBe("admin-1");

      // Verify balance update: outstanding → approved (unpaid state)
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: -50, approvedBalance: 50 },
        "payment.reconciled",
        "admin-1",
        mocks.mockBatch,
      );

      expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
    });

    it("transitions pending → approved and updates balance (pending → approved)", async () => {
      const pendingPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 50,
        status: "pending",
        initiatedAt: "2026-08-27T10:00:00.000Z",
      };

      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => pendingPayment,
      });

      const result = await reconcilePayment("team-1", "payment-1", "admin-1");

      expect(result.status).toBe("approved");

      // Verify balance update: pending → approved
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { pendingBalance: -50, approvedBalance: 50 },
        "payment.reconciled",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("transitions disputed → approved and updates balance (outstanding → approved)", async () => {
      const disputedPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 50,
        status: "disputed",
      };

      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => disputedPayment,
      });

      await reconcilePayment("team-1", "payment-1", "admin-1");

      // Disputed acts like unpaid: outstanding → approved
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: -50, approvedBalance: 50 },
        "payment.reconciled",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("writes activity log with correct action", async () => {
      const unpaidPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 50,
        status: "unpaid",
      };

      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => unpaidPayment,
      });

      await reconcilePayment("team-1", "payment-1", "admin-1");

      // Check activity log entry
      const logCall = mocks.mockBatch.set.mock.calls.find(
        ([, data]: [unknown, Record<string, unknown>]) => data.action === "payment.reconciled",
      );

      expect(logCall).toBeDefined();
      const [, logData] = logCall as [unknown, Record<string, unknown>];
      expect(logData.entityType).toBe("payment");
      expect(logData.actorId).toBe("admin-1");
    });
  });
});
