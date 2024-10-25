import mongoose from "mongoose";

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentInfo: {
      razorpayOrderId: {
        type: String,
        required: true,
      },
      razorpayPaymentId: {
        type: String,
        required: true,
      },
      paymentStatus:{
        type: String,
        required: true,
      }
    },
    orderItems: 
      {
        book: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Book",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    
    paidAt: {
      type: Date,
      default: Date.now(),
    },
    month: {
      type: Number,
      default: new Date().getMonth(),
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    totalPriceAfterDiscount: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      default: "Ordered",
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
const Order = mongoose.model("Order",orderSchema);
export default Order;