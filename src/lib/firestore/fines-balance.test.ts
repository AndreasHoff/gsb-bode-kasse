import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Fine, Payment } from "../../types/domain";

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
    mockGetDocs: vi.fn(),
    mockQuery: vi.fn((...args: unknown[]) => args),
    mockWhere: vi.fn((...args: unknown[]) => args),
    mockWriteBatch: vi.fn(() => mockBatch),
    fineDocMock: vi.fn((teamId: string, fineId: string) => ({ teamId, fineId })),
    paymentsColMock: vi.fn((teamId: string) => ({ teamId })),
    activityLogColMock: vi.fn((teamId: string) => ({ teamId })),
    updateUserSeasonBalance: vi.fn(),
  };
});

// Mock Firestore
vi.mock("firebase/firestore", () => ({
  writeBatch: mocks.mockWriteBatch,
  doc: mocks.mockDoc,
  getDoc: mocks.mockGetDoc,
  getDocs: mocks.mockGetDocs,
  query: mocks.mockQuery,
  where: mocks.mockWhere,
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("./refs", () => ({
  fineDoc: mocks.fineDocMock,
  paymentsCol: mocks.paymentsColMock,
  activityLogCol: mocks.activityLogColMock,
}));

vi.mock("./balances", () => ({
  updateUserSeasonBalance: mocks.updateUserSeasonBalance,
}));

// Import after mocks are set up
import { softDeleteFine, restoreFine } from "./fines";

const baseFine: Fine = {
  id: "fine-1",
  teamId: "team-1",
  seasonId: "season-1",
  title: "For sent",
  amount: 150,
  assignedTo: ["user-1"],
  assignedBy: "admin-1",
  isShared: false,
  createdAt: "2026-08-27T10:00:00.000Z",
};

describe("Fine operations with balance tracking (F024)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("softDeleteFine", () => {
    it("decrements outstandingBalance when payment is unpaid", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => baseFine,
      });

      const unpaidPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "unpaid",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => unpaidPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await softDeleteFine("team-1", "fine-1", "admin-1");

      // Verify balance was decremented from outstandingBalance
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: -150 },
        "fine.deleted",
        "admin-1",
        mocks.mockBatch,
      );

      expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
    });

    it("decrements pendingBalance when payment is pending", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => baseFine,
      });

      const pendingPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "pending",
        initiatedAt: "2026-08-27T10:00:00.000Z",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => pendingPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await softDeleteFine("team-1", "fine-1", "admin-1");

      // Verify balance was decremented from pendingBalance
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { pendingBalance: -150 },
        "fine.deleted",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("decrements approvedBalance when payment is approved", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => baseFine,
      });

      const approvedPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "approved",
        initiatedAt: "2026-08-27T10:00:00.000Z",
        approvedAt: "2026-08-27T11:00:00.000Z",
        approvedBy: "admin-1",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => approvedPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await softDeleteFine("team-1", "fine-1", "admin-1");

      // Verify balance was decremented from approvedBalance
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { approvedBalance: -150 },
        "fine.deleted",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("decrements outstandingBalance when payment is disputed", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => baseFine,
      });

      const disputedPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "disputed",
        initiatedAt: "2026-08-27T10:00:00.000Z",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => disputedPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await softDeleteFine("team-1", "fine-1", "admin-1");

      // Disputed payments count as outstanding
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: -150 },
        "fine.deleted",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("handles shared fines with multiple payments correctly", async () => {
      const sharedFine: Fine = {
        ...baseFine,
        amount: 200,
        assignedTo: ["user-1", "user-2"],
        isShared: true,
      };

      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => sharedFine,
      });

      const payment1: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 100,
        status: "unpaid",
      };

      const payment2: Payment = {
        id: "payment-2",
        fineIds: ["fine-1"],
        userId: "user-2",
        amount: 100,
        status: "pending",
        initiatedAt: "2026-08-27T10:00:00.000Z",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => payment1 }, { data: () => payment2 }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await softDeleteFine("team-1", "fine-1", "admin-1");

      // User 1: unpaid → outstanding
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: -100 },
        "fine.deleted",
        "admin-1",
        mocks.mockBatch,
      );

      // User 2: pending → pending
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-2",
        "team-1",
        "season-1",
        { pendingBalance: -100 },
        "fine.deleted",
        "admin-1",
        mocks.mockBatch,
      );
    });
  });

  describe("restoreFine", () => {
    const deletedFine: Fine = {
      ...baseFine,
      deletedAt: "2026-08-27T12:00:00.000Z",
      deletedBy: "admin-1",
    };

    it("increments outstandingBalance when payment is unpaid", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => deletedFine,
      });

      const unpaidPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "unpaid",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => unpaidPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await restoreFine("team-1", "fine-1", "admin-1");

      // Verify balance was incremented to outstandingBalance
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: 150 },
        "fine.restored",
        "admin-1",
        mocks.mockBatch,
      );

      expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
    });

    it("increments pendingBalance when payment is pending", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => deletedFine,
      });

      const pendingPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "pending",
        initiatedAt: "2026-08-27T10:00:00.000Z",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => pendingPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await restoreFine("team-1", "fine-1", "admin-1");

      // Verify balance was incremented to pendingBalance
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { pendingBalance: 150 },
        "fine.restored",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("increments approvedBalance when payment is approved", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => deletedFine,
      });

      const approvedPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "approved",
        initiatedAt: "2026-08-27T10:00:00.000Z",
        approvedAt: "2026-08-27T11:00:00.000Z",
        approvedBy: "admin-1",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => approvedPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await restoreFine("team-1", "fine-1", "admin-1");

      // Verify balance was incremented to approvedBalance
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { approvedBalance: 150 },
        "fine.restored",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("increments outstandingBalance when payment is disputed", async () => {
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => deletedFine,
      });

      const disputedPayment: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 150,
        status: "disputed",
        initiatedAt: "2026-08-27T10:00:00.000Z",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => disputedPayment }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await restoreFine("team-1", "fine-1", "admin-1");

      // Disputed payments count as outstanding
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { outstandingBalance: 150 },
        "fine.restored",
        "admin-1",
        mocks.mockBatch,
      );
    });

    it("handles shared fines with multiple users", async () => {
      const sharedDeletedFine: Fine = {
        ...deletedFine,
        amount: 200,
        assignedTo: ["user-1", "user-2"],
        isShared: true,
      };

      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => sharedDeletedFine,
      });

      const payment1: Payment = {
        id: "payment-1",
        fineIds: ["fine-1"],
        userId: "user-1",
        amount: 100,
        status: "approved",
        initiatedAt: "2026-08-27T10:00:00.000Z",
        approvedAt: "2026-08-27T11:00:00.000Z",
        approvedBy: "admin-1",
      };

      const payment2: Payment = {
        id: "payment-2",
        fineIds: ["fine-1"],
        userId: "user-2",
        amount: 100,
        status: "unpaid",
      };

      // First getDocs call (fineIds array-contains)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => payment1 }, { data: () => payment2 }],
      });

      // Second getDocs call (legacy fineId)
      mocks.mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      await restoreFine("team-1", "fine-1", "admin-1");

      // User 1: approved → approved
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-1",
        "team-1",
        "season-1",
        { approvedBalance: 100 },
        "fine.restored",
        "admin-1",
        mocks.mockBatch,
      );

      // User 2: unpaid → outstanding
      expect(mocks.updateUserSeasonBalance).toHaveBeenCalledWith(
        "user-2",
        "team-1",
        "season-1",
        { outstandingBalance: 100 },
        "fine.restored",
        "admin-1",
        mocks.mockBatch,
      );
    });
  });
});
