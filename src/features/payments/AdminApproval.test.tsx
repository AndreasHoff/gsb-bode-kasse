import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminApproval from "./AdminApproval";
import type { Payment } from "../../types/domain";

const mocks = vi.hoisted(() => ({
  getPendingPaymentsMock: vi.fn(),
  approvePaymentMock: vi.fn(),
  disputePaymentMock: vi.fn(),
  getUserProfileMock: vi.fn(),
  getFineMock: vi.fn(),
}));

vi.mock("../../lib/firestore/payments", () => ({
  getPendingPayments: mocks.getPendingPaymentsMock,
  approvePayment: mocks.approvePaymentMock,
  disputePayment: mocks.disputePaymentMock,
}));

vi.mock("../../lib/firestore/users", () => ({
  getUserProfile: mocks.getUserProfileMock,
}));

vi.mock("../../lib/firestore/fines", () => ({
  getFine: mocks.getFineMock,
}));

const basePayment: Payment = {
  id: "payment-1",
  fineId: "fine-1",
  userId: "user-1",
  amount: 50,
  status: "pending",
  initiatedAt: "2026-05-29T10:00:00.000Z",
};

describe("AdminApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPendingPaymentsMock.mockResolvedValue([basePayment]);
    mocks.getUserProfileMock.mockResolvedValue({ name: "Morten" });
    mocks.getFineMock.mockResolvedValue({ title: "For sent til træning" });
    mocks.approvePaymentMock.mockResolvedValue(undefined);
    mocks.disputePaymentMock.mockResolvedValue(undefined);
  });

  it("shows access denied message for members", () => {
    render(
      <AdminApproval
        teamId="team-1"
        actorId="admin-1"
        userRole="member"
      />,
    );

    expect(screen.getByText("Du har ikke adgang til at godkende betalinger.")).toBeInTheDocument();
  });

  it("loads and renders pending payment rows", async () => {
    render(
      <AdminApproval
        teamId="team-1"
        actorId="admin-1"
        userRole="admin"
      />,
    );

    expect(await screen.findByText("Morten")).toBeInTheDocument();
    expect(screen.getByText("For sent til træning")).toBeInTheDocument();
    expect(mocks.getPendingPaymentsMock).toHaveBeenCalledWith("team-1");
  });

  it("approves a payment and removes it from the list", async () => {
    const user = userEvent.setup();

    render(
      <AdminApproval
        teamId="team-1"
        actorId="admin-1"
        userRole="admin"
      />,
    );

    await screen.findByText("Morten");

    await user.click(screen.getByRole("button", { name: "Godkend" }));

    await waitFor(() => {
      expect(mocks.approvePaymentMock).toHaveBeenCalledWith("team-1", "payment-1", "admin-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Morten")).not.toBeInTheDocument();
    });
  });

  it("disputes a payment and removes it from the list", async () => {
    const user = userEvent.setup();

    render(
      <AdminApproval
        teamId="team-1"
        actorId="admin-1"
        userRole="admin"
      />,
    );

    await screen.findByText("Morten");

    await user.click(screen.getByRole("button", { name: "Afvis" }));

    await waitFor(() => {
      expect(mocks.disputePaymentMock).toHaveBeenCalledWith("team-1", "payment-1", "admin-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Morten")).not.toBeInTheDocument();
    });
  });
});
