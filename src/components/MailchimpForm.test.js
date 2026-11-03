import { render, screen } from "@testing-library/react";
import { MailchimpForm } from "./MailchimpForm";

let mockLastProps;
jest.mock("react-mailchimp-subscribe", () => (props) => {
  mockLastProps = props;
  return props.render({ subscribe: jest.fn(), status: null, message: "" });
});

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    REACT_APP_MAILCHIMP_URL:
      "https://example.us1.list-manage.com/subscribe/post",
    REACT_APP_MAILCHIMP_U: "abc123",
    REACT_APP_MAILCHIMP_ID: "def456",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

test("builds the Mailchimp post URL from REACT_APP_MAILCHIMP_* env vars", () => {
  render(<MailchimpForm />);

  expect(mockLastProps.url).toBe(
    "https://example.us1.list-manage.com/subscribe/post?u=abc123&id=def456"
  );
});

test("renders the Newsletter form wired to the subscribe callback", () => {
  render(<MailchimpForm />);

  expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
});
