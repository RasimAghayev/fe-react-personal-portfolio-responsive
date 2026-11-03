const express = require("express");
const router = express.Router();
const cors = require("cors");
const nodemailer = require("nodemailer");

// Minimal structured logger: one JSON object per line, no new dependency
// for a single-route service this small.
const log = (level, message, meta = {}) => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }));
};

// server used to send send emails
const app = express();
app.use(cors());
app.use(express.json());
app.use("/", router);

const PORT = process.env.PORT || 5000;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const CONTACT_RECIPIENT = process.env.CONTACT_RECIPIENT || EMAIL_USER;

if (!EMAIL_USER || !EMAIL_PASS) {
    log("error", "EMAIL_USER and EMAIL_PASS must be set in the environment. See .env.example.");
    process.exit(1);
}

let mailerReady = false;

if (require.main === module) {
    app.listen(PORT, () => log("info", `Server running on port ${PORT}`));
}

const contactEmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

contactEmail.verify((error) => {
    if (error) {
        log("error", "Mailer verification failed", { error: error.message });
    } else {
        mailerReady = true;
        log("info", "Mailer ready to send");
    }
});

// Liveness: the process is up and serving requests at all.
router.get("/health/live", (req, res) => {
    res.json({ status: "ok" });
});

// Readiness: the process is up AND its one real dependency (the mail
// transport) has been verified usable.
router.get("/health/ready", (req, res) => {
    if (mailerReady) {
        res.json({ status: "ok" });
    } else {
        res.status(503).json({ status: "unavailable", reason: "mailer not verified" });
    }
});

router.post("/contact", (req, res) => {
    const name = req.body.firstName + req.body.lastName;
    const email = req.body.email;
    const message = req.body.message;
    const phone = req.body.phone;
    const mail = {
        from: name,
        to: CONTACT_RECIPIENT,
        subject: "Contact Form Submission - Portfolio",
        html: `<p>Name: ${name}</p>
   <p>Email: ${email}</p>
   <p>Phone: ${phone}</p>
   <p>Message: ${message}</p>`,
    };
    contactEmail.sendMail(mail, (error) => {
        if (error) {
            log("error", "Failed to send contact email", { error: error.message });
            res.status(502).json({ code: 502, status: "Failed to send", error: error.message });
        } else {
            log("info", "Contact email sent");
            res.json({ code: 200, status: "Message Sent" });
        }
    });
});

module.exports = app;
