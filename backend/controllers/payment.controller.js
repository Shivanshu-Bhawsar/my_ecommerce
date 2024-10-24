import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../config/stripe.js";
import instance from "../config/razorpay.js";

export const createCheckoutSession = async (req, res) => {
	try {
		const { products, couponCode } = req.body;
		console.log("1");

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}
		console.log("2");

		let totalAmount = 0;

		// Calculate totalAmount based on product prices and quantities
		products.forEach((product) => {
			const amount = product.price;
			totalAmount += amount * product.quantity;
		});
		console.log("3");

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
			if (coupon) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			}
		}
		console.log("4");

		if (totalAmount >= 20000) {
			await createNewCoupon(req.user._id);
		}
		console.log("5");

		// order create
		const options = {
			amount: totalAmount * 100,
			currency: "INR",
			receipt: Math.random(Date.now()).toString(),
		};
		console.log("6");

		try {
			// initiate the payment using razorpay
			const paymentResponse = await instance.orders.create(options);
			console.log("paymentResponse: ", paymentResponse);

			return res.status(200).json({
				success: true,
				data: paymentResponse,
				message: "Payment Captured Successfully"
			});
		}
		catch(err){
			return res.status(400).json({
				success: false,
				error: err.message,
				message: "Could not initiate order",
			});
		}

		// const session = await stripe.checkout.sessions.create({
		// 	payment_method_types: ["card"],
		// 	line_items: lineItems,
		// 	mode: "payment",
		// 	success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
		// 	cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
		// 	discounts: coupon
		// 		? [
		// 				{
		// 					coupon: await createStripeCoupon(coupon.discountPercentage),
		// 				},
		// 		  ]
		// 		: [],
		// 	metadata: {
		// 		userId: req.user._id.toString(),
		// 		couponCode: couponCode || "",
		// 		products: JSON.stringify(
		// 			products.map((p) => ({
		// 				id: p._id,
		// 				quantity: p.quantity,
		// 				price: p.price,
		// 			}))
		// 		),
		// 	},
		// });

		
		// res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
	} catch (error) {
		console.error("Error processing checkout:", error);
		res.status(500).json({ message: "Error processing checkout, please try again", error: error.message });
	}
};

// export const checkoutSuccess = async (req, res) => {
// 	try {
// 		const { sessionId } = req.body;
// 		const session = await stripe.checkout.sessions.retrieve(sessionId);

// 		if (session.payment_status === "paid") {
// 			if (session.metadata.couponCode) {
// 				await Coupon.findOneAndUpdate(
// 					{
// 						code: session.metadata.couponCode,
// 						userId: session.metadata.userId,
// 					},
// 					{
// 						isActive: false,
// 					}
// 				);
// 			}

// 			// create a new Order
// 			const products = JSON.parse(session.metadata.products);
// 			const newOrder = new Order({
// 				user: session.metadata.userId,
// 				products: products.map((product) => ({
// 					product: product.id,
// 					quantity: product.quantity,
// 					price: product.price,
// 				})),
// 				totalAmount: session.amount_total / 100, // convert from cents to dollars,
// 				stripeSessionId: sessionId,
// 			});

// 			await newOrder.save();

// 			res.status(200).json({
// 				success: true,
// 				message: "Payment successful, order created, and coupon deactivated if used.",
// 				orderId: newOrder._id,
// 			});
// 		}
// 	} catch (error) {
// 		console.error("Error processing successful checkout:", error);
// 		res.status(500).json({ message: "Error processing successful checkout", error: error.message });
// 	}
// };

// async function createStripeCoupon(discountPercentage) {
// 	const coupon = await stripe.coupons.create({
// 		percent_off: discountPercentage,
// 		duration: "once",
// 	});

// 	return coupon.id;
// }

async function createNewCoupon(userId) {
	await Coupon.findOneAndDelete({ userId });

	const newCoupon = new Coupon({
		code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
		discountPercentage: 10,
		expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
		userId: userId,
	});

	await newCoupon.save();

	return newCoupon;
}

export const verifySignature = async (req,res) => {
    const razorpay_order_id = req.body?.razorpay_order_id;
    const razorpay_payment_id = req.body?.razorpay_payment_id;
    const razorpay_signature = req.body?.razorpay_signature;
    // const courses = req.body?.courses;
    // const userId = req.user.id;

    if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(404).json({
            success: false,
            message: "Please provide all details",
        });
    }

    let body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

    if(expectedSignature === razorpay_signature){
        // enroll the student in all courses
        // await enrollStudents(courses, userId, res);

        return res.status(200).json({
            success: true,
            message: "Payment Verified",
        });
    }

    return res.status(500).json({
        success: false,
        message: "Payment Failed",
    });
};
