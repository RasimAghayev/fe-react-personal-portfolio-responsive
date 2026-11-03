import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Contact } from "./Contact";

beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => {
    jest.resetAllMocks();
});

test("typing into First Name and Last Name updates their values", () => {
    render(<Contact />);
    const firstName = screen.getByPlaceholderText("First Name");
    const lastName = screen.getByPlaceholderText("Last Name");

    fireEvent.change(firstName, { target: { value: "Rasim" } });
    fireEvent.change(lastName, { target: { value: "Aghayev" } });

    expect(firstName).toHaveValue("Rasim");
    expect(lastName).toHaveValue("Aghayev");
});

test("submitting the form posts to the contact API and shows a success message", async () => {
    global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200 }),
    });

    render(<Contact />);
    fireEvent.change(screen.getByPlaceholderText("First Name"), { target: { value: "Rasim" } });
    fireEvent.change(screen.getByPlaceholderText("Email Address"), { target: { value: "rasim@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/contact$/),
        expect.objectContaining({ method: "POST" })
    );

    const message = await screen.findByText("Message sent successfully");
    expect(message).toHaveClass("success");
});

test("submitting the form shows a danger message when the backend reports failure", async () => {
    global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 500 }),
    });

    render(<Contact />);
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    const message = await screen.findByText("Something went wrong, please try again later.");
    expect(message).toHaveClass("danger");
});

test("form fields reset after a submission", async () => {
    global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 200 }),
    });

    render(<Contact />);
    const firstName = screen.getByPlaceholderText("First Name");
    fireEvent.change(firstName, { target: { value: "Rasim" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(firstName).toHaveValue(""));
});
