
import mongoose from "mongoose";
import { AvailableCouponTypes,CouponTypeEnum } from "../constants.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    couponCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: AvailableCouponTypes,
      default: CouponTypeEnum.FLAT,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    minimumCartValue: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

couponSchema.plugin(mongooseAggregatePaginate);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;