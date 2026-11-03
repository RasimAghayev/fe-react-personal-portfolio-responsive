import { render, screen, fireEvent, act } from "@testing-library/react";
import { NavBar } from "./NavBar";

function setScrollY(value) {
    Object.defineProperty(window, "scrollY", { value, writable: true, configurable: true });
}

afterEach(() => {
    setScrollY(0);
});

test("navbar does not have the scrolled class initially", () => {
    const { container } = render(<NavBar />);
    expect(container.querySelector("nav")).not.toHaveClass("scrolled");
});

test("navbar gains the scrolled class once the page scrolls past 50px", () => {
    const { container } = render(<NavBar />);

    act(() => {
        setScrollY(100);
        window.dispatchEvent(new Event("scroll"));
    });

    expect(container.querySelector("nav")).toHaveClass("scrolled");
});

test("navbar loses the scrolled class when scrolling back to the top", () => {
    const { container } = render(<NavBar />);

    act(() => {
        setScrollY(100);
        window.dispatchEvent(new Event("scroll"));
    });
    expect(container.querySelector("nav")).toHaveClass("scrolled");

    act(() => {
        setScrollY(0);
        window.dispatchEvent(new Event("scroll"));
    });
    expect(container.querySelector("nav")).not.toHaveClass("scrolled");
});

test("clicking a nav link marks it active and the previously active link inactive", () => {
    render(<NavBar />);
    const home = screen.getByRole("link", { name: "Home" });
    const skills = screen.getByRole("link", { name: "Skills" });

    expect(home).toHaveClass("active");
    expect(skills).not.toHaveClass("active");

    fireEvent.click(skills);

    expect(skills).toHaveClass("active");
    expect(home).not.toHaveClass("active");
});
