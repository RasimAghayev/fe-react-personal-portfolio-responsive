process.env.EMAIL_USER = "test@example.com";
process.env.EMAIL_PASS = "test-password";
process.env.CONTACT_RECIPIENT = "recipient@example.com";

const mockVerify = jest.fn();
const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
    createTransport: () => ({
        verify: mockVerify,
        sendMail: mockSendMail,
    }),
}));

const http = require("http");
const app = require("./server");

const listen = () =>
    new Promise((resolve) => {
        const server = app.listen(0, () => resolve(server));
    });

// react-scripts bundles an older Jest whose node test environment doesn't
// expose a global `fetch`, so requests go through Node's http module directly.
const request = (baseUrl, path, options = {}) =>
    new Promise((resolve, reject) => {
        const req = http.request(
            `${baseUrl}${path}`,
            { method: options.method || "GET", headers: options.headers },
            (res) => {
                let body = "";
                res.on("data", (chunk) => (body += chunk));
                res.on("end", () => resolve({ status: res.statusCode, json: () => JSON.parse(body) }));
            }
        );
        req.on("error", reject);
        if (options.body) req.write(options.body);
        req.end();
    });

describe("server.js", () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        server = await listen();
        baseUrl = `http://localhost:${server.address().port}`;
        mockSendMail.mockImplementation((mail, cb) => cb(null));
    });

    afterAll((done) => {
        server.close(done);
    });

    test("GET /health/live always reports ok", async () => {
        const res = await request(baseUrl, "/health/live");
        expect(res.status).toBe(200);
        expect(res.json()).toEqual({ status: "ok" });
    });

    test("GET /health/ready reports unavailable before the mailer verifies", async () => {
        const res = await request(baseUrl, "/health/ready");
        expect(res.status).toBe(503);
        expect(res.json()).toEqual({ status: "unavailable", reason: "mailer not verified" });
    });

    test("GET /health/ready reports ok once the mailer verifies", async () => {
        // server.js called nodemailer's verify(callback) exactly once at
        // require-time; invoke that same callback to simulate the async
        // verification resolving successfully.
        const verifyCallback = mockVerify.mock.calls[0][0];
        verifyCallback(null);

        const res = await request(baseUrl, "/health/ready");
        expect(res.status).toBe(200);
        expect(res.json()).toEqual({ status: "ok" });
    });

    test("POST /contact sends the mail and returns code 200 on success", async () => {
        const res = await request(baseUrl, "/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Ada",
                lastName: "Lovelace",
                email: "ada@example.com",
                phone: "555-1234",
                message: "Hello",
            }),
        });
        expect(res.status).toBe(200);
        expect(res.json()).toEqual({ code: 200, status: "Message Sent" });

        const [sentMail] = mockSendMail.mock.calls.at(-1);
        expect(sentMail.to).toBe("recipient@example.com");
        expect(sentMail.html).toContain("ada@example.com");
    });

    test("POST /contact returns a 502 with the real error when sendMail fails", async () => {
        mockSendMail.mockImplementationOnce((mail, cb) => cb(new Error("SMTP connection refused")));

        const res = await request(baseUrl, "/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName: "A", lastName: "B", email: "a@b.com", phone: "", message: "" }),
        });
        expect(res.status).toBe(502);
        expect(res.json()).toEqual({
            code: 502,
            status: "Failed to send",
            error: "SMTP connection refused",
        });
    });
});
