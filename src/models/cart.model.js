import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const cartSchema = new mongoose.Schema(
    {
        owner:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        },
        Items:{
            type:[
                {
                    bookId:{
                        type:mongoose.Schema.Types.ObjectId,
                        ref:'Book'
                    },
                    quantity: {
                        type: Number,
                        required: true,
                        min: [1, "Quantity can not be less then 1."],
                        default: 1,
                    },
                }
            ],
            default: [],
            coupon: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Coupon",
                default: null,
            },
        }
    },{timestamps:true}
)

const Cart = mongoose.model("Cart",cartSchema);
export default Cart;