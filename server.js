const express = require("express");
const router = express.Router();
const cors = require("cors");
const nodemailer = require("nodemailer");

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
    console.error("EMAIL_USER and EMAIL_PASS must be set in the environment. See .env.example.");
    process.exit(1);
}

app.listen(PORT, () => console.log(`Server Running on port ${PORT}`));

const contactEmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

contactEmail.verify((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Ready to Send");
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
            res.json(error);
        } else {
            res.json({ code: 200, status: "Message Sent" });
        }
    });
});
