import Wishlist from '../models/wishlist.model.js';
import Book from '../models/book.model.js'

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";


const getWishlist = asyncHandler(async (req, res) => {
    let wishlist = await Wishlist.findOne({ owner: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ owner: req.user._id });
    }
    return res
    .status(200)
    .json(new ApiResponse(200, wishlist, 'Wishlist fetched successfully'));
})



const createAndAddItemToWishlist = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    console.log("added to wish",bookId)
    const wishlist = await Wishlist.findOneAndUpdate(
      { owner: req.user._id },
      { $addToSet: { Books: bookId } },
      { upsert: true, new: true }
    );
   
    return res
      .status(200)
      .json(new ApiResponse(200, wishlist, 'Item added to wishlist'));
  });

  const removebookFromWishlist = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
   
    const wishlist = await Wishlist.findOneAndUpdate(
      { owner: req.user._id },
      { $pull: { Books: bookId } },
      { upsert: true, new: true }
    );
    
    return res
      .status(200)
      .json(new ApiResponse(200, wishlist, 'Book removed to wishlist'));
  });


export{
    getWishlist,
    removebookFromWishlist,
    createAndAddItemToWishlist
}