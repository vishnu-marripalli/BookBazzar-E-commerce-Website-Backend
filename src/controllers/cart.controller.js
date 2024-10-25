import Cart from "../models/cart.model.js";
import Book from '../models/book.model.js'

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";



const getCart = async(userId)=>{
    const cartAggregation = await Cart.aggregate([
        {
            $match:{
                owner:userId
            }
        },
        {
            $unwind: '$items',
        },
        {
            $lookup:{
                from:"books",
                localField: 'items.bookId',
                foreignField: '_id',
                as: 'book',
            }
        },
        {
            $project:{
                book: { $first: '$book' },
                quantity: '$items.quantity',
                coupon: 1, // also project coupon field
            }
        },
        {
            $group: {
                _id: '$_id',
                items: {
                $push: '$$ROOT',
                },
                coupon: { $first: '$coupon' }, // get first value of coupon after grouping
                cartTotal: {
                    $sum: {
                        $multiply: ['$book.price', '$quantity'], // calculate the cart total based on book price * total quantity
                    },
                },
            },
        },
        {
            $lookup: {
              // lookup for the coupon
              from: 'coupons',
              localField: 'coupon',
              foreignField: '_id',
              as: 'coupon',
            },
          },
          {
            $addFields: {
              // As lookup returns an array we access the first item in the lookup array
              coupon: { $first: '$coupon' },
            },
          },
          {
            $addFields: {
                discountedTotal: {
                // Final total is the total we get once user applies any coupon
                // final total is total cart value - coupon's discount value
                $ifNull: [
                    {
                    $subtract: ['$cartTotal', '$coupon.discountValue'],
                    },
                    '$cartTotal', // if there is no coupon applied we will set cart total as out final total
                    ,
                ],
                },
            },
        }
    ])
    return (
        cartAggregation[0] ?? {
          _id: null,
          items: [],
          cartTotal: 0,
          discountedTotal: 0,
        }
      );

}

const getUserCart = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
}
   let cart = await getCart(req.user._id);

    if (!cart._id) {
      cart = await Cart.create({ owner: req.user._id });
      cart = await getCart(req.user._id);
    }
    return res
    .status(200)
    .json(new ApiResponse(200, cart, 'Cart fetched successfully'));
})


const addItemOrUpdateItemQuantity = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { quantity = 1 } = req.body;


    let cart = await Cart.findOne({
        owner: req.user._id,
      });
    
    if (!cart) {
    // if cart does not exist create a new cart
    cart = await Cart.create({
        owner: req.user._id,
    });
    }

    const book = await Book.findById(bookId);

    if (!book) {
        throw new ApiError(404, 'Book does not exist');
    }
    // If book is there check if the quantity that user is adding is less than or equal to the book's stock
    if (quantity > book.stock) {
        // if quantity is greater throw an error
        throw new ApiError(
        400,
        book.stock > 0
            ? 'Only ' +
            book.stock +
            ' books are remaining. But you are adding ' +
            quantity
            : 'book is out of stock'
        );
    }

  // See if the book that user661fb1f01baff6adfc705ee7 is adding already exists in the cart
  const addedBook = cart.items?.find(
    (item) => item.bookId.toString() === bookId
  );
  if (addedBook) {
    // If book already exist assign a new quantity to it
    // ! We are not adding or subtracting quantity to keep it dynamic. Frontend will send us updated quantity here
    addedBook.quantity = quantity;
    // if user updates the cart remove the coupon associated with the cart to avoid misuse
    // Do this only if quantity changes because if user adds a new project the cart total will increase anyways
    if (cart.coupon) {
      cart.coupon = null;
    }
  } else {
    // if its a new book being added in the cart push it to the cart items
    cart.items.push({
      bookId,
      quantity,
    });
  }

  // Finally save the cart
  await cart.save({ validateBeforeSave: true });

  const newCart = await getCart(req.user._id); // structure the user cart

  return res
    .status(200)
    .json(new ApiResponse(200, newCart, 'Item added successfully'));
})

const removeItemFromCart = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
  
    const book = await Book.findById(bookId);
  
    // check for book existence
    if (!book) {
      throw new ApiError(404, 'Book does not exist');
    }
  
    const updatedCart = await Cart.findOneAndUpdate(
      {
        owner: req.user._id,
      },
      {
        // Pull the book inside the cart items
        // ! We are not handling decrement logic here that's we are doing in addItemOrUpdateItemQuantity method
        // ! this controller is responsible to remove the cart item entirely
        $pull: {
          items: {
            bookId: bookId,
          },
        },
      },
      { new: true }
    );
  
    let cart = await getCart(req.user._id);
  
    // check if the cart's new total is greater than the minimum cart total requirement of the coupon
    if (cart.coupon && cart.cartTotal < cart.coupon.minimumCartValue) {
      // if it is less than minimum cart value remove the coupon code which is applied
      updatedCart.coupon = null;
      await updatedCart.save({ validateBeforeSave: false });
      // fetch the latest updated cart
      cart = await getCart(req.user._id);
    }
  
    return res
      .status(200)
      .json(new ApiResponse(200, cart, 'Cart item removed successfully'));
  });
  
const clearCart = asyncHandler(async (req, res) => {
    await Cart.findOneAndUpdate(
      {
        owner: req.user._id,
      },
      {
        $set: {
          items: [],
          coupon: null,
        },
      },
      { new: true }
    );
    const cart = await getCart(req.user._id);
  
    return res
      .status(200)
      .json(new ApiResponse(200, cart, 'Cart has been cleared'));
});
  


  export {
    getCart,
    getUserCart,
    addItemOrUpdateItemQuantity,
    removeItemFromCart,
    clearCart,
  }