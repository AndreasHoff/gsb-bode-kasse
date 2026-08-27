import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSeasonBalance, Season } from "../../types/domain";

// Hoist all mocks
const mocks = vi.hoisted(() => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockBatch,
    mockDoc: vi.fn(() => ({ id: `balance-${Math.random().toString(36).slice(2)}` })),
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
    mockQuery: vi.fn((...args: unknown[]) => args),
    mockWhere: vi.fn((...args: unknown[]) => args),
    mockWriteBatch: vi.fn(() => mockBatch),
    userSeasonBalancesColMock: vi.fn((teamId: string) => ({ teamId })),
    userSeasonBalanceDocMock: vi.fn((teamId: string, balanceId: string) => ({ teamId, balanceId })),
    seasonDocMock: vi.fn((teamId: string, seasonId: string) => ({ teamId, seasonId })),
    activityLogColMock: vi.fn((teamId: string) => ({ teamId })),
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
  userSeasonBalancesCol: mocks.userSeasonBalancesColMock,
  userSeasonBalanceDoc: mocks.userSeasonBalanceDocMock,
  seasonDoc: mocks.seasonDocMock,
  activityLogCol: mocks.activityLogColMock,
}));

// Import after mocks are set up
import {
  getUserSeasonBalance,
  getOrCreateUserSeasonBalance,
  updateUserSeasonBalance,
  getSeasonBalances,
  getUserBalances,
} from "./balances";

describe("getUserSeasonBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no balance exists", async () => {
    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    const result = await getUserSeasonBalance("user-1", "team-1", "season-1");

    expect(result).toBeNull();
    expect(mocks.mockQuery).toHaveBeenCalled();
    expect(mocks.mockWhere).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(mocks.mockWhere).toHaveBeenCalledWith("seasonId", "==", "season-1");
  });

  it("returns the balance when it exists", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 100,
      pendingBalance: 50,
      approvedBalance: 200,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => existingBalance,
        },
      ],
    });

    const result = await getUserSeasonBalance("user-1", "team-1", "season-1");

    expect(result).toEqual(existingBalance);
  });
});

describe("getOrCreateUserSeasonBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing balance if found", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 100,
      pendingBalance: 0,
      approvedBalance: 0,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    const result = await getOrCreateUserSeasonBalance("user-1", "team-1", "season-1");

    expect(result).toEqual(existingBalance);
    expect(mocks.mockBatch.set).not.toHaveBeenCalled();
  });

  it("creates a new balance with zero values if not found", async () => {
    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    const result = await getOrCreateUserSeasonBalance("user-1", "team-1", "season-1");

    expect(result.userId).toBe("user-1");
    expect(result.teamId).toBe("team-1");
    expect(result.seasonId).toBe("season-1");
    expect(result.outstandingBalance).toBe(0);
    expect(result.pendingBalance).toBe(0);
    expect(result.approvedBalance).toBe(0);
    expect(result.updatedAt).toBeDefined();
  });

  it("uses provided batch if available", async () => {
    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    await getOrCreateUserSeasonBalance("user-1", "team-1", "season-1", mocks.mockBatch);

    expect(mocks.mockBatch.set).toHaveBeenCalledOnce();
    expect(mocks.mockBatch.commit).not.toHaveBeenCalled();
  });

  it("commits immediately if no batch provided", async () => {
    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    await getOrCreateUserSeasonBalance("user-1", "team-1", "season-1");

    expect(mocks.mockBatch.set).toHaveBeenCalledOnce();
    expect(mocks.mockBatch.commit).toHaveBeenCalledOnce();
  });
});

describe("updateUserSeasonBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates balance if it doesn't exist and applies delta", async () => {
    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
      totalOutstanding: 0,
      totalPendingBalance: 0,
      totalApprovedBalance: 0,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { outstandingBalance: 50 },
      "fine.assigned",
      "admin-1",
      mocks.mockBatch,
    );

    // Should create the balance, update it, update season, and log
    expect(mocks.mockBatch.set).toHaveBeenCalledTimes(4);

    // Check balance update call (second set)
    const [, balanceData] = mocks.mockBatch.set.mock.calls[1] as [unknown, UserSeasonBalance];
    expect(balanceData.outstandingBalance).toBe(50);
    expect(balanceData.pendingBalance).toBe(0);
    expect(balanceData.approvedBalance).toBe(0);

    // Check season update call (third set)
    const [, seasonData] = mocks.mockBatch.set.mock.calls[2] as [unknown, Season];
    expect(seasonData.totalOutstanding).toBe(50);

    // Check activity log (fourth set)
    const [, logData] = mocks.mockBatch.set.mock.calls[3] as [unknown, Record<string, unknown>];
    expect(logData.action).toBe("balance.updated");
    expect(logData.entityType).toBe("userSeasonBalance");
    expect(logData.metadata).toMatchObject({
      userId: "user-1",
      seasonId: "season-1",
      delta: { outstandingBalance: 50 },
      trigger: "fine.assigned",
    });
  });

  it("applies delta to existing balance correctly", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 100,
      pendingBalance: 50,
      approvedBalance: 200,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
      totalOutstanding: 500,
      totalPendingBalance: 200,
      totalApprovedBalance: 1000,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    // Move 50 from outstanding to pending (payment initiated)
    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { outstandingBalance: -50, pendingBalance: 50 },
      "payment.initiated",
      "user-1",
      mocks.mockBatch,
    );

    // Check balance update
    const [, balanceData] = mocks.mockBatch.set.mock.calls[0] as [unknown, UserSeasonBalance];
    expect(balanceData.outstandingBalance).toBe(50); // 100 - 50
    expect(balanceData.pendingBalance).toBe(100); // 50 + 50
    expect(balanceData.approvedBalance).toBe(200); // unchanged

    // Check season update
    const [, seasonData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Season];
    expect(seasonData.totalOutstanding).toBe(450); // 500 - 50
    expect(seasonData.totalPendingBalance).toBe(250); // 200 + 50
  });

  it("handles payment approval transition (pending → approved)", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 0,
      pendingBalance: 100,
      approvedBalance: 0,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
      totalOutstanding: 0,
      totalPendingBalance: 300,
      totalApprovedBalance: 0,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { pendingBalance: -100, approvedBalance: 100 },
      "payment.approved",
      "admin-1",
      mocks.mockBatch,
    );

    const [, balanceData] = mocks.mockBatch.set.mock.calls[0] as [unknown, UserSeasonBalance];
    expect(balanceData.pendingBalance).toBe(0); // 100 - 100
    expect(balanceData.approvedBalance).toBe(100); // 0 + 100

    const [, seasonData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Season];
    expect(seasonData.totalPendingBalance).toBe(200); // 300 - 100
    expect(seasonData.totalApprovedBalance).toBe(100); // 0 + 100
  });

  it("handles payment dispute transition (pending → outstanding)", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 0,
      pendingBalance: 50,
      approvedBalance: 0,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
      totalOutstanding: 0,
      totalPendingBalance: 150,
      totalApprovedBalance: 0,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { pendingBalance: -50, outstandingBalance: 50 },
      "payment.disputed",
      "admin-1",
      mocks.mockBatch,
    );

    const [, balanceData] = mocks.mockBatch.set.mock.calls[0] as [unknown, UserSeasonBalance];
    expect(balanceData.pendingBalance).toBe(0); // 50 - 50
    expect(balanceData.outstandingBalance).toBe(50); // 0 + 50

    const [, seasonData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Season];
    expect(seasonData.totalPendingBalance).toBe(100); // 150 - 50
    expect(seasonData.totalOutstanding).toBe(50); // 0 + 50
  });

  it("handles payment refund transition (approved → outstanding)", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 0,
      pendingBalance: 0,
      approvedBalance: 100,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
      totalOutstanding: 0,
      totalPendingBalance: 0,
      totalApprovedBalance: 500,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { approvedBalance: -100, outstandingBalance: 100 },
      "payment.refunded",
      "admin-1",
      mocks.mockBatch,
    );

    const [, balanceData] = mocks.mockBatch.set.mock.calls[0] as [unknown, UserSeasonBalance];
    expect(balanceData.approvedBalance).toBe(0); // 100 - 100
    expect(balanceData.outstandingBalance).toBe(100); // 0 + 100

    const [, seasonData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Season];
    expect(seasonData.totalApprovedBalance).toBe(400); // 500 - 100
    expect(seasonData.totalOutstanding).toBe(100); // 0 + 100
  });

  it("handles fine deletion by decrementing appropriate balance", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 100,
      pendingBalance: 0,
      approvedBalance: 0,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
      totalOutstanding: 500,
      totalPendingBalance: 0,
      totalApprovedBalance: 0,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { outstandingBalance: -50 },
      "fine.deleted",
      "admin-1",
      mocks.mockBatch,
    );

    const [, balanceData] = mocks.mockBatch.set.mock.calls[0] as [unknown, UserSeasonBalance];
    expect(balanceData.outstandingBalance).toBe(50); // 100 - 50

    const [, seasonData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Season];
    expect(seasonData.totalOutstanding).toBe(450); // 500 - 50
  });

  it("initializes season totals to 0 if undefined", async () => {
    const existingBalance: UserSeasonBalance = {
      id: "balance-1",
      userId: "user-1",
      teamId: "team-1",
      seasonId: "season-1",
      outstandingBalance: 0,
      pendingBalance: 0,
      approvedBalance: 0,
      updatedAt: "2026-08-27T10:00:00.000Z",
    };

    mocks.mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingBalance }],
    });

    // Season without balance fields (legacy data)
    const season: Season = {
      id: "season-1",
      teamId: "team-1",
      name: "2026",
      startDate: "2026-01-01T00:00:00.000Z",
      isActive: true,
    };

    mocks.mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => season,
    });

    await updateUserSeasonBalance(
      "user-1",
      "team-1",
      "season-1",
      { outstandingBalance: 50 },
      "fine.assigned",
      "admin-1",
      mocks.mockBatch,
    );

    const [, seasonData] = mocks.mockBatch.set.mock.calls[1] as [unknown, Season];
    expect(seasonData.totalOutstanding).toBe(50); // 0 (default) + 50
    expect(seasonData.totalPendingBalance).toBe(0);
    expect(seasonData.totalApprovedBalance).toBe(0);
  });
});

describe("getSeasonBalances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all balances for a season", async () => {
    const balances: UserSeasonBalance[] = [
      {
        id: "balance-1",
        userId: "user-1",
        teamId: "team-1",
        seasonId: "season-1",
        outstandingBalance: 100,
        pendingBalance: 0,
        approvedBalance: 0,
        updatedAt: "2026-08-27T10:00:00.000Z",
      },
      {
        id: "balance-2",
        userId: "user-2",
        teamId: "team-1",
        seasonId: "season-1",
        outstandingBalance: 0,
        pendingBalance: 50,
        approvedBalance: 100,
        updatedAt: "2026-08-27T11:00:00.000Z",
      },
    ];

    mocks.mockGetDocs.mockResolvedValueOnce({
      docs: balances.map((b) => ({ data: () => b })),
    });

    const result = await getSeasonBalances("team-1", "season-1");

    expect(result).toHaveLength(2);
    expect(result).toEqual(balances);
    expect(mocks.mockWhere).toHaveBeenCalledWith("seasonId", "==", "season-1");
  });
});

describe("getUserBalances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all balances for a user across seasons", async () => {
    const balances: UserSeasonBalance[] = [
      {
        id: "balance-1",
        userId: "user-1",
        teamId: "team-1",
        seasonId: "season-1",
        outstandingBalance: 0,
        pendingBalance: 0,
        approvedBalance: 200,
        updatedAt: "2026-08-27T10:00:00.000Z",
      },
      {
        id: "balance-2",
        userId: "user-1",
        teamId: "team-1",
        seasonId: "season-2",
        outstandingBalance: 50,
        pendingBalance: 0,
        approvedBalance: 0,
        updatedAt: "2026-08-27T11:00:00.000Z",
      },
    ];

    mocks.mockGetDocs.mockResolvedValueOnce({
      docs: balances.map((b) => ({ data: () => b })),
    });

    const result = await getUserBalances("team-1", "user-1");

    expect(result).toHaveLength(2);
    expect(result).toEqual(balances);
    expect(mocks.mockWhere).toHaveBeenCalledWith("userId", "==", "user-1");
  });
});
