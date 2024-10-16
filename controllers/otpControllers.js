const connectDB = require("../config/db")
const { generateOTP } = require('../config/otpService');
const { sendOTPEmail } = require('../config/nodeMialer');

const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const db = await connectDB();
        const collection = db.collection('otp');

        const storedOTP = await collection.findOne({ userEmail: email });

        if (!storedOTP) {
            return res.status(400).send("No OTP found for this email.");
        }

        const { otp: otpRecord, expiresAt } = storedOTP;
        const currentTime = new Date().getTime();

        if (otp === otpRecord && currentTime < expiresAt) {
            return res.send({ message: "OTP verified successfully!" });

        } else {
            return res.status(400).send("Invalid or expired OTP.");
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Server error while verifying OTP.");
    }
}

const replaceOTP = async (req, res) => {
    const { email } = req.params;

    try {
        const db = await connectDB();
        const collection = db.collection('otp');
        const newOTP = await generateOTP(email);

        const otpDetails = {
            userEmail: email,
            otp: newOTP,
            createdAt: new Date(),
            expiresAt: new Date().getTime() + 10 * 60 * 1000,
        };

        const result = await collection.replaceOne(
            { userEmail: email },
            otpDetails,
            { upsert: true }
        );

        if (result.modifiedCount) {
            await sendOTPEmail(email, otpDetails?.otp)
            res.send(result);
        }
    }
    catch (error) {
        console.log(error)
    }
}

module.exports = { replaceOTP, verifyOTP }