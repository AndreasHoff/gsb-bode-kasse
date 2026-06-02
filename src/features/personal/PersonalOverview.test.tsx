import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PersonalOverview from "./PersonalOverview";
import type { Fine, Payment } from "../../types/domain";

// Hoist all mocks
const mocks = vi.hoisted(() => ({
  getActiveSeasonMock: vi.fn(),
  getFinesForUserMock: vi.fn(),
  getPaymentsForUserMock: vi.fn(),
  getTeamMock: vi.fn(),
  getUsersMock: vi.fn(),
  initiatePaymentMock: vi.fn(),
}));

vi.mock("../../lib/firestore", () => ({
  getActiveSeason: mocks.getActiveSeasonMock,
  getFinesForUser: mocks.getFinesForUserMock,
  getPaymentsForUser: mocks.getPaymentsForUserMock,
  getTeam: mocks.getTeamMock,
  getUsers: mocks.getUsersMock,
  initiatePayment: mocks.initiatePaymentMock,
}));

// Suppress MobilePay deep-link navigation in tests
vi.stubGlobal("location", { assign: vi.fn() });

const activeSeason = {
  id: "season-1",
  teamId: "team-1",
  name: "2026",
  isActive: true,
  startDate: "2026-01-01T00:00:00.000Z",
};

const adminUser = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const baseFine: Fine = {
  id: "fine-1",
  teamId: "team-1",
  seasonId: "season-1",
  title: "For sent til træning",
  amount: 50,
  assignedTo: ["user-1"],
  assignedBy: "admin-1",
  isShared: false,
  createdAt: "2026-06-01T10:00:00.000Z",
};

const unpaidPayment: Payment = {
  id: "payment-1",
  fineId: "fine-1",
  userId: "user-1",
  amount: 50,
  status: "unpaid",
};

function setupDefaultMocks() {
  mocks.getActiveSeasonMock.mockResolvedValue(activeSeason);
  mocks.getFinesForUserMock.mockResolvedValue([baseFine]);
  mocks.getPaymentsForUserMock.mockResolvedValue([unpaidPayment]);
  mocks.getTeamMock.mockResolvedValue({
    id: "team-1",
    name: "GSB",
    slug: "gsb",
    createdAt: "2026-01-01",
    mobilePayRecipient: null,
  });
  mocks.getUsersMock.mockResolvedValue([adminUser]);
}

describe("PersonalOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("renders the page title and stat cards", async () => {
    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    expect(await screen.findByText("Min profil")).toBeInTheDocument();
    expect(screen.getByText("Bøder i alt")).toBeInTheDocument();
    expect(screen.getByText("Skylder")).toBeInTheDocument();
    expect(screen.getByText("Betalt")).toBeInTheDocument();
  });

  it("displays unpaid fines with a Betal button", async () => {
    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    expect(await screen.findByText("For sent til træning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Betal" })).toBeInTheDocument();
  });

  it("shows the correct unpaid total", async () => {
    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    // Wait for loading to finish, then check the "Skylder" stat card
    await waitFor(() => {
      const statValues = screen.getAllByText("50 kr.");
      // At least the stat card should show 50 kr.
      expect(statValues.length).toBeGreaterThanOrEqual(1);
    });

    // The "Skylder" label should always be paired with the owed amount
    expect(screen.getByText("Skylder")).toBeInTheDocument();
  });

  it("calls initiatePayment when Betal is clicked and refreshes data", async () => {
    const user = userEvent.setup();

    const pendingPayment: Payment = { ...unpaidPayment, status: "pending", initiatedAt: "2026-06-01T11:00:00.000Z" };
    mocks.initiatePaymentMock.mockResolvedValue(pendingPayment);

    // After the click the component calls loadData again — return pending payment this time
    mocks.getPaymentsForUserMock
      .mockResolvedValueOnce([unpaidPayment])   // initial load
      .mockResolvedValue([pendingPayment]);       // reload after initiate

    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    const payButton = await screen.findByRole("button", { name: "Betal" });
    await user.click(payButton);

    await waitFor(() => {
      expect(mocks.initiatePaymentMock).toHaveBeenCalledWith("team-1", "payment-1", "user-1");
    });

    // The fine should now be in the "Afventer godkendelse" section
    await waitFor(() => {
      expect(screen.getByText("Afventer godkendelse")).toBeInTheDocument();
    });
  });

  it("renders pending fines in the 'Afventer godkendelse' section", async () => {
    const pendingPayment: Payment = { ...unpaidPayment, status: "pending", initiatedAt: "2026-06-01T11:00:00.000Z" };
    mocks.getPaymentsForUserMock.mockResolvedValue([pendingPayment]);

    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    expect(await screen.findByText("Afventer godkendelse")).toBeInTheDocument();
    expect(screen.getByText("For sent til træning")).toBeInTheDocument();

    // There should be no "Betal" button for pending fines
    expect(screen.queryByRole("button", { name: "Betal" })).not.toBeInTheDocument();
  });

  it("renders approved fines in the 'Vis betalte bøder' collapsible section", async () => {
    const approvedPayment: Payment = {
      ...unpaidPayment,
      status: "approved",
      approvedAt: "2026-06-02T09:00:00.000Z",
      approvedBy: "admin-1",
    };
    mocks.getPaymentsForUserMock.mockResolvedValue([approvedPayment]);

    const user = userEvent.setup();
    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    // Toggle the collapsible
    const toggle = await screen.findByRole("button", { name: /Vis betalte bøder/i });
    await user.click(toggle);

    expect(screen.getByText("For sent til træning")).toBeInTheDocument();
    expect(screen.getByText("✅ Betalt")).toBeInTheDocument();
  });

  it("shows an empty state when the user has no fines", async () => {
    mocks.getFinesForUserMock.mockResolvedValue([]);
    mocks.getPaymentsForUserMock.mockResolvedValue([]);

    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    expect(await screen.findByText("Du har ingen bøder i aktiv sæson.")).toBeInTheDocument();
  });

  it("shows an empty state when there is no active season", async () => {
    mocks.getActiveSeasonMock.mockResolvedValue(null);
    mocks.getFinesForUserMock.mockResolvedValue([]);
    mocks.getPaymentsForUserMock.mockResolvedValue([]);

    render(<PersonalOverview teamId="team-1" userId="user-1" />);

    expect(await screen.findByText("Du har ingen bøder i aktiv sæson.")).toBeInTheDocument();
  });

  it("renders in viewer mode with the member's name as the title", async () => {
    render(
      <PersonalOverview teamId="team-1" userId="user-1" viewerName="Morten" />,
    );

    expect(await screen.findByText("Morten")).toBeInTheDocument();

    // In viewer mode there should be no pay button
    expect(screen.queryByRole("button", { name: "Betal" })).not.toBeInTheDocument();
  });
});
