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

const fineOne: Fine = {
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

const fineTwo: Fine = {
  id: "fine-2",
  teamId: "team-1",
  seasonId: "season-1",
  title: "Glemte fjerbolde",
  amount: 25,
  assignedTo: ["user-1"],
  assignedBy: "admin-1",
  isShared: false,
  createdAt: "2026-08-02T10:00:00.000Z",
};

const unpaidPayment: Payment = {
  id: "payment-unpaid",
  fineIds: ["fine-1", "fine-2"],
  userId: "user-1",
  amount: 75,
  status: "unpaid",
};

const pendingPayment: Payment = {
  id: "payment-pending",
  fineIds: ["fine-1", "fine-2"],
  userId: "user-1",
  amount: 75,
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
    mocks.getFinesForUserMock.mockResolvedValue([fineOne, fineTwo]);
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
    // Spy on location.href setter instead of window.open (navigation changed to same-tab)
    vi.spyOn(window, "open").mockReturnValue(null);
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, href: "" },
    });
  });

  it("registers selected fines payment when user returns to app", async () => {
    const user = userEvent.setup();
    const selectedPendingPayment: Payment = {
      ...pendingPayment,
      fineIds: ["fine-1"],
      amount: 50,
    };
    mocks.getPaymentsForUserMock
      .mockResolvedValueOnce([unpaidPayment])
      .mockResolvedValue([selectedPendingPayment]);

    renderProfile();

    const fineTwoCheckbox = await screen.findByRole("checkbox", {
      name: /Glemte fjerbolde/i,
    });
    await user.click(fineTwoCheckbox);

    const payButton = screen.getByRole("button", {
      name: /Betal valgte bøder via MobilePay/i,
    });
    await user.click(payButton);

    expect(window.location.href).toBe(
      "https://qr.mobilepay.dk/box/test",
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
        "Betaling modtaget! En admin godkender hurtigst muligt. 🎉",
      ),
    ).toBeInTheDocument();
  });

  it("registers all outstanding fines when user taps pay all", async () => {
    const user = userEvent.setup();
    mocks.getPaymentsForUserMock
      .mockResolvedValueOnce([unpaidPayment])
      .mockResolvedValue([pendingPayment]);

    renderProfile();

    const payAllButton = await screen.findByRole("button", {
      name: /Betal alle udestående bøder via MobilePay/i,
    });
    await user.click(payAllButton);
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(mocks.createCombinedPaymentMock).toHaveBeenCalledWith(
        "team-1",
        ["fine-1", "fine-2"],
        "user-1",
        75,
        "user-1",
      );
    });
  });

  it("shows pending amount as temporary paid", async () => {
    mocks.getPaymentsForUserMock.mockResolvedValue([pendingPayment]);

    renderProfile();

    expect(
      await screen.findByText(/Midlertidigt betalt: 75 kr\./i),
    ).toBeInTheDocument();
  });
});
