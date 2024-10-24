// server creation
import express from "express";
const app = express();

// importing
import analyticsRoutes from "./routes/analytics.route.js";
import authRoutes from "./routes/auth.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from './routes/payment.route.js';
import productRoutes from "./routes/product.route.js";

import dbConnect from "./config/db.js";
import cloudinaryConnect from "./config/cloudinary.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from 'express-fileupload';
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;

// middleware to parse json request body
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

// Configure CORS with specific origin and credentials
const corsOptions = {
  origin: "http://localhost:3000", // Frontend URL
  credentials: true, // Allow credentials (cookies, sessions)
};

app.use(cors(corsOptions)); // Apply CORS with options

// connections
dbConnect();
cloudinaryConnect();

// mounting
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

// start server
app.listen(PORT, () => {
  console.log(`Server started successfully at ${PORT}`);
});

// default route
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Your server is up and running....",
  });
});
