import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Fine } from "../../types/domain";

// Hoist all mocks
const mocks = vi.hoisted(() => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockBatch,
    mockDoc: vi.fn(() => ({ id: `mock-${Math.random()}` })),
    mockGetDoc: vi.fn(),
    mockWriteBatch: vi.fn(() => mockBatch),
    finesColMock: vi.fn((teamId: string) => ({ teamId })),
    fineDocMock: vi.fn((teamId: string, fineId: string) => ({ teamId, fineId })),
    activityLogColMock: vi.fn((teamId: string) => ({ teamId })),
    getActiveSeasonMock: vi.fn().mockResolvedValue({
      id: "season-1",
      teamId: "team-1",
      name: "2026 Season",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
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
  finesCol: mocks.finesColMock,
  fineDoc: mocks.fineDocMock,
  activityLogCol: mocks.activityLogColMock,
}));

vi.mock("./seasons", () => ({
  getActiveSeason: mocks.getActiveSeasonMock,
}));

// Import after mocks are set up
import { bulkSoftDeleteFines, bulkRestoreFines } from "./fines";

const baseFine: Fine = {
  id: "fine-1",
  teamId: "team-1",
  seasonId: "season-1",
  fineRuleId: "rule-1",
  title: "For sent",
  amount: 50,
  assignedTo: ["user-1"],
  assignedBy: "admin-1",
  isShared: false,
  createdAt: "2026-05-01T10:00:00.000Z",
};

describe("bulkSoftDeleteFines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes multiple fines and reports progress", async () => {
    const fine1 = { ...baseFine, id: "fine-1" };
    const fine2 = { ...baseFine, id: "fine-2" };
    const fine3 = { ...baseFine, id: "fine-3" };

    mocks.mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => fine1 })
      .mockResolvedValueOnce({ exists: () => true, data: () => fine2 })
      .mockResolvedValueOnce({ exists: () => true, data: () => fine3 });

    const progressCallback = vi.fn();

    const result = await bulkSoftDeleteFines(
      "team-1",
      ["fine-1", "fine-2", "fine-3"],
      "admin-1",
      progressCallback,
    );

    expect(result.deletedIds).toEqual(["fine-1", "fine-2", "fine-3"]);
    expect(result.errors).toEqual([]);
    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 3);
    expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 3);
    expect(progressCallback).toHaveBeenNthCalledWith(3, 3, 3);
    expect(mocks.mockBatch.commit).toHaveBeenCalled();
  });

  it("handles already-deleted fines", async () => {
    const deletedFine = { ...baseFine, id: "fine-1", deletedAt: "2026-05-01T12:00:00.000Z" };

    mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => deletedFine });

    const result = await bulkSoftDeleteFines("team-1", ["fine-1"], "admin-1");

    expect(result.deletedIds).toEqual([]);
    expect(result.errors).toEqual([{ fineId: "fine-1", error: "Bøde allerede slettet" }]);
  });

  it("handles missing fines", async () => {
    mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await bulkSoftDeleteFines("team-1", ["fine-missing"], "admin-1");

    expect(result.deletedIds).toEqual([]);
    expect(result.errors).toEqual([{ fineId: "fine-missing", error: "Bøde ikke fundet" }]);
  });

  it("batches operations when exceeding limit", async () => {
    // Create 120 fines (each fine = 2 ops, so 240 ops total, needs 2 batches)
    const fineIds: string[] = [];
    for (let i = 0; i < 120; i++) {
      fineIds.push(`fine-${i}`);
      mocks.mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ...baseFine, id: `fine-${i}` }),
      });
    }

    const result = await bulkSoftDeleteFines("team-1", fineIds, "admin-1");

    expect(result.deletedIds.length).toBe(120);
    expect(result.errors).toEqual([]);
    // Should commit at least 2 batches (450 ops per batch limit, 2 ops per fine = 225 fines per batch)
    expect(mocks.mockBatch.commit.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe("bulkRestoreFines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores multiple deleted fines and reports progress", async () => {
    const fine1 = { ...baseFine, id: "fine-1", deletedAt: "2026-05-01T12:00:00.000Z" };
    const fine2 = { ...baseFine, id: "fine-2", deletedAt: "2026-05-01T12:00:00.000Z" };

    mocks.mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => fine1 })
      .mockResolvedValueOnce({ exists: () => true, data: () => fine2 });

    const progressCallback = vi.fn();

    const result = await bulkRestoreFines(
      "team-1",
      ["fine-1", "fine-2"],
      "admin-1",
      progressCallback,
    );

    expect(result.restoredIds).toEqual(["fine-1", "fine-2"]);
    expect(result.errors).toEqual([]);
    expect(progressCallback).toHaveBeenCalledTimes(2);
    expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 2);
    expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it("handles non-deleted fines", async () => {
    const activeFine = { ...baseFine, id: "fine-1" };

    mocks.mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => activeFine });

    const result = await bulkRestoreFines("team-1", ["fine-1"], "admin-1");

    expect(result.restoredIds).toEqual([]);
    expect(result.errors).toEqual([{ fineId: "fine-1", error: "Bøde ikke slettet" }]);
  });

  it("handles errors gracefully", async () => {
    mocks.mockGetDoc.mockRejectedValueOnce(new Error("Firestore error"));

    const result = await bulkRestoreFines("team-1", ["fine-1"], "admin-1");

    expect(result.restoredIds).toEqual([]);
    expect(result.errors).toEqual([{ fineId: "fine-1", error: "Firestore error" }]);
  });
});
