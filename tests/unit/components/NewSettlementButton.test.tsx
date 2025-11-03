import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import NewSettlementButton from "@/components/NewSettlementButton";

describe("NewSettlementButton", () => {
  const defaultProps = {
    disabled: false,
    onClick: vi.fn(),
  };

  it("renders with correct text", () => {
    render(<NewSettlementButton {...defaultProps} />);

    expect(screen.getByText("Nowe rozliczenie")).toBeInTheDocument();
  });

  it("renders with Plus icon", () => {
    render(<NewSettlementButton {...defaultProps} />);

    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    render(<NewSettlementButton {...defaultProps} onClick={mockOnClick} />);

    const button = screen.getByRole("button", { name: /nowe rozliczenie/i });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<NewSettlementButton {...defaultProps} disabled={true} />);

    const button = screen.getByRole("button", { name: /nowe rozliczenie/i });
    expect(button).toBeDisabled();
  });

  it("is enabled when disabled prop is false", () => {
    render(<NewSettlementButton {...defaultProps} disabled={false} />);

    const button = screen.getByRole("button", { name: /nowe rozliczenie/i });
    expect(button).not.toBeDisabled();
  });
});
