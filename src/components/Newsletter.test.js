import { render, screen, fireEvent } from "@testing-library/react";
import { Newsletter } from "./Newsletter";

test("typing into the email field updates its value", () => {
  render(<Newsletter status={null} message="" onValidated={jest.fn()} />);
  const email = screen.getByPlaceholderText("Email Address");

  fireEvent.change(email, { target: { value: "ada@example.com" } });

  expect(email).toHaveValue("ada@example.com");
});

test("submitting a valid email calls onValidated with EMAIL", () => {
  const onValidated = jest.fn();
  render(<Newsletter status={null} message="" onValidated={onValidated} />);
  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "ada@example.com" },
  });

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  expect(onValidated).toHaveBeenCalledWith({ EMAIL: "ada@example.com" });
});

test("submitting without an @ in the email does not call onValidated", () => {
  const onValidated = jest.fn();
  render(<Newsletter status={null} message="" onValidated={onValidated} />);
  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "not-an-email" },
  });

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  expect(onValidated).not.toHaveBeenCalled();
});

test("submitting an empty email does not call onValidated", () => {
  const onValidated = jest.fn();
  render(<Newsletter status={null} message="" onValidated={onValidated} />);

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  expect(onValidated).not.toHaveBeenCalled();
});

test("shows the sending alert while status is 'sending'", () => {
  render(<Newsletter status="sending" message="" onValidated={jest.fn()} />);
  expect(screen.getByText("Sending...")).toBeInTheDocument();
});

test("shows the backend's message as a danger alert when status is 'error'", () => {
  render(
    <Newsletter
      status="error"
      message="Already subscribed"
      onValidated={jest.fn()}
    />
  );
  expect(screen.getByText("Already subscribed")).toHaveClass("alert-danger");
});

test("shows the backend's message as a success alert when status is 'success'", () => {
  render(
    <Newsletter
      status="success"
      message="Subscribed!"
      onValidated={jest.fn()}
    />
  );
  expect(screen.getByText("Subscribed!")).toHaveClass("alert-success");
});

test("clears the email field once status becomes 'success'", () => {
  const { rerender } = render(
    <Newsletter status={null} message="" onValidated={jest.fn()} />
  );
  const email = screen.getByPlaceholderText("Email Address");
  fireEvent.change(email, { target: { value: "ada@example.com" } });
  expect(email).toHaveValue("ada@example.com");

  rerender(
    <Newsletter
      status="success"
      message="Subscribed!"
      onValidated={jest.fn()}
    />
  );

  expect(screen.getByPlaceholderText("Email Address")).toHaveValue("");
});
