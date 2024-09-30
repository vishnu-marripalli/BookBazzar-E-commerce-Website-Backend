import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { AvailableBookCondition, BookConditionEnum } from "../constants";

const bookSchema =new mongoose.Schema({
    title: {
        required: true,
        type: String,
    },
    author: {
        required: true,
        type: String,
    },
    genre:{
        required: true,
        type: String,
    }, 
    description: {
        required: true,
        type: String,
    },
    mainImage: {
        required: true,
        type: {
          url: String,
          public_id: String,
        },
    },
    condition: {
        required: true,
        type: String,
        enum:AvailableBookCondition,
        default:BookConditionEnum.NEW
    },
    language: {
        required: true,
        type: String,
    },
    user: {
        ref: 'User',
        type: mongoose.Schema.Types.ObjectId,
    },

    price: {
        default: 0,
        type: Number,
    },
    stock: {
        default: 0,
        type: Number,
    },
    subImages: {
        type: [
          {
            url: String,
            public_id: String,
          },
        ],
        default: [],
      },
    publishedDate :{
        type:Date,
        required:true
    },
    rating:{
        type:{
            averageRating:{
                default: 0,
                type: Number,
            },
            totalReviews:{
                default: 0,
                type: Number,
            }
        }
    }

    },

    { timestamps: true }
);



bookSchema.plugin(mongooseAggregatePaginate);


const Book = mongoose.model("Book",bookSchema);
export default Book;