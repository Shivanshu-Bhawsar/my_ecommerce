import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	// loadScript function is correct
	loadScript: async (src) => {
		return new Promise((resolve) => {
		  const script = document.createElement("script");
		  script.src = src;
		  script.onload = () => {
			resolve(true);
		  };
		  script.onerror = () => {
			resolve(false);
		  };
		  document.body.appendChild(script);
		});
	  },

	getMyCoupon: async () => {
		try {
			const response = await axios.get("/coupons");
			console.log("coupon: ", response.data);
			
			set({ coupon: response.data });
		} catch (error) {
			console.error("Error fetching coupon:", error);
		}
	},
	applyCoupon: async (code) => {
		try {
			const response = await axios.post("/coupons/validate", { code });
			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success("Coupon applied successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to apply coupon");
		}
	},
	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		try {
			const res = await axios.get("/cart");
			set({ cart: res.data });
			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			toast.error(error.response.data.message || "An error occurred");
		}
	},
	clearCart: async () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0 });
	},
	addToCart: async (product) => {
		try {
			await axios.post("/cart", { productId: product._id });
			toast.success("Product added to cart");

			set((prevState) => {
				const existingItem = prevState.cart.find((item) => item._id === product._id);
				const newCart = existingItem
					? prevState.cart.map((item) =>
							item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
					  )
					: [...prevState.cart, { ...product, quantity: 1 }];
				return { cart: newCart };
			});
			get().calculateTotals();
		} catch (error) {
			toast.error(error.response.data.message || "An error occurred");
		}
	},
	removeFromCart: async (productId) => {
		await axios.delete(`/cart`, { data: { productId } });
		toast.success("Product removed from cart");
		set((prevState) => ({ cart: prevState.cart.filter((item) => item._id !== productId) }));
		get().calculateTotals();
	},
	updateQuantity: async (productId, quantity) => {
		if (quantity === 0) {
			get().removeFromCart(productId);
			return;
		}

		await axios.put(`/cart/${productId}`, { quantity });
		set((prevState) => ({
			cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
		}));
		get().calculateTotals();
	},
	calculateTotals: () => {
		const { cart, coupon } = get();
		const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
		let total = subtotal;

		if (coupon) {
			const discount = subtotal * (coupon.discountPercentage / 100);
			total = subtotal - discount;
		}

		set({ subtotal, total });
	},

	
	buyNow: async (cart, coupon) => {
		const toastId = toast.loading("Please wait while we redirect you to payment gateway", {
		  position: "bottom-center",
		  autoClose: false,
		});

		const { loadScript } = get();
		
		try {
			const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
			if (!res) {
				toast.error("Razorpay SDK failed to load. Are you online?");
				toast.dismiss(toastId);
				return;
			}
	
			const orderResponse = await axios.post("/payments/create-checkout-session", {
					products: cart,
					couponCode: coupon ? coupon.code : null,
			});
			// const orderResponse = await axios.post("POST", COURSE_PAYMENT_API, {courses}, {
			// 	Authorization: `Bearer ${token}`,
			// });
			console.log("buyCourse -> orderResponse", orderResponse);
			if(!orderResponse.data.success) {
				toast.error(orderResponse.data.message);
				toast.dismiss(toastId);
				return;
			}
			// console.log("buyCourse -> orderResponse: ", orderResponse);
	
			// console.log("API KEY: ", process.env.REACT_APP_RAZORPAY_KEY_ID);
			const options = {
				key: process.env.REACT_APP_RAZORPAY_KEY_ID,
				currency: orderResponse.data.data.currency,
				amount: orderResponse.data.data.amount,
				order_id: orderResponse.data.data.id,
				name: "Study Notion",
				description: "Thank you for purchasing the course",
				// image: rzplogo,
				// prefill: {
				// 	name: userDetails?.firstName + " " + userDetails?.lastName,
				// 	email: userDetails?.email,
				// },
				handler: async function (response) {
					// console.log("buyCourse -> response: ", response);
					// sendPaymentSuccessEmail(response, orderResponse.data.data.amount, token);
					verifypayment(response);
				},
				theme: {
					color: "#686CFD",
				},
			};
			const paymentObject = new window.Razorpay(options);
			paymentObject.open();
			paymentObject.on("payment.failed", function (response) {
				toast.error("Payment Failed");
				// console.log("BUY COURSE PAYMENT RES: ", response);
			});
		} catch (error) {
			toast.error("Something went wrong");
			// console.log("buyCourse -> error: ", error);
		}
		toast.dismiss(toastId);
	},
}));

const verifypayment = async (response) => {
		const toastId = toast.loading("Please wait while we verify your payment");
		try{
			const res = await axios.post("/payments/verifyPayment", {
				razorpay_payment_id: response.razorpay_payment_id,
				razorpay_order_id: response.razorpay_order_id,
				razorpay_signature: response.razorpay_signature,
				// courses: courses,
			});
			// console.log("verifypayment -> res: ", res);
	
			if (!res.data.success) {
				toast.error(res.message);
				toast.dismiss(toastId);
				return;
			}
	
			// const result = await apiConnector(
			//   "PUT",
			//   profileEndpoints.RESET_CART_DATA_API,
			//   {courses},
			//   {
			// 	Authorization: `Bearer ${token}`,
			//   }
			// );
	
			// if (!result.data.success) {
			// 	toast.error(result.message);
			// 	toast.dismiss(toastId);
			// 	return;
			// }
	
			toast.success("Payment Successfull");
			// navigate("/dashboard/enrolled-courses");
			// dispatch(resetCart());
		}
		catch(err){
			toast.error("Could not Verify Payment");
			// console.log("PAYMENT VERIFY ERROR: ", err.message);
		}
		toast.dismiss(toastId);
		// dispatch(setPaymentLoading(false));
	}
