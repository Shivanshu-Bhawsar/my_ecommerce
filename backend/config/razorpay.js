// const Razorpay = require("razorpay");
import Razorpay from "razorpay";
// require("dotenv").config();

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

export default instance;