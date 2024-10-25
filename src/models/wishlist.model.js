import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    Books: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    },
    owner: {
      ref: 'User',
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;