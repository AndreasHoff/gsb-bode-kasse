import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserProfile from "./UserProfile";
import type { Fine, Payment } from "../../types/domain";

const mocks = vi.hoisted(() => ({
  getFinesForUserMock: vi.fn(),
  getPaymentsForUserMock: vi.fn(),
  getTeamMock: vi.fn(),
  updateUserProfileMock: vi.fn(),
  createCombinedPaymentMock: vi.fn(),
}));

vi.mock("../../lib/firestore", () => ({
  getFinesForUser: mocks.getFinesForUserMock,
  getPaymentsForUser: mocks.getPaymentsForUserMock,
  getTeam: mocks.getTeamMock,
  updateUserProfile: mocks.updateUserProfileMock,
  createCombinedPayment: mocks.createCombinedPaymentMock,
}));

const fine: Fine = {
  id: "fine-1",
  teamId: "team-1",
  seasonId: "season-1",
  title: "For sent",
  amount: 50,
  assignedTo: ["user-1"],
  assignedBy: "admin-1",
  isShared: false,
  createdAt: "2026-08-01T10:00:00.000Z",
};

const unpaidPayment: Payment = {
  id: "payment-unpaid",
  fineIds: ["fine-1"],
  userId: "user-1",
  amount: 50,
  status: "unpaid",
};

const pendingPayment: Payment = {
  id: "payment-pending",
  fineIds: ["fine-1"],
  userId: "user-1",
  amount: 50,
  status: "pending",
  initiatedAt: "2026-08-01T11:00:00.000Z",
};

function renderProfile() {
  return render(
    <UserProfile
      userId="user-1"
      teamId="team-1"
      email="user@example.com"
      displayName="Morten"
      onNameChange={vi.fn()}
    />,
  );
}

describe("UserProfile payment flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.getFinesForUserMock.mockResolvedValue([fine]);
    mocks.getPaymentsForUserMock.mockResolvedValue([unpaidPayment]);
    mocks.getTeamMock.mockResolvedValue({
      id: "team-1",
      name: "GSB",
      slug: "gsb",
      createdAt: "2026-01-01T00:00:00.000Z",
      mobilePayBoxUrl: "https://qr.mobilepay.dk/box/test",
    });
    mocks.updateUserProfileMock.mockResolvedValue(undefined);
    mocks.createCombinedPaymentMock.mockResolvedValue(pendingPayment);
    vi.spyOn(window, "open").mockReturnValue(null);
  });

  it("registers payment and shows feedback when user returns to app", async () => {
    const user = userEvent.setup();
    mocks.getPaymentsForUserMock
      .mockResolvedValueOnce([unpaidPayment])
      .mockResolvedValue([pendingPayment]);

    renderProfile();

    const payButton = await screen.findByRole("button", {
      name: /Betal udestående bøder via MobilePay/i,
    });
    await user.click(payButton);

    expect(window.open).toHaveBeenCalledWith(
      "https://qr.mobilepay.dk/box/test",
      "_blank",
      "noopener,noreferrer",
    );
    expect(mocks.createCombinedPaymentMock).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(mocks.createCombinedPaymentMock).toHaveBeenCalledWith(
        "team-1",
        ["fine-1"],
        "user-1",
        50,
        "user-1",
      );
    });

    expect(
      await screen.findByText(
        "Din betaling er modtaget. En admin vil godkende hurtigst muligt.",
      ),
    ).toBeInTheDocument();
  });

  it("shows pending amount as temporary paid", async () => {
    mocks.getPaymentsForUserMock.mockResolvedValue([pendingPayment]);

    renderProfile();

    expect(
      await screen.findByText(/Midlertidigt betalt: 50 kr\./i),
    ).toBeInTheDocument();
  });
});
