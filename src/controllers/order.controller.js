import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import Book from '../models/book.model.js'
import Order from '../models/order.model.js'
import crypto from 'crypto'
import Razorpay from 'razorpay'
 


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = asyncHandler(async (req, res, next) => {
    const { cart, discountedTotalPrice, totalPrice } = req.body;
    console.log(cart)
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        throw new ApiError(400, 'Invalid cart data');
    }

    if (!discountedTotalPrice || !totalPrice) {
        throw new ApiError(400, 'Price information is required');
    }

    try {
        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(discountedTotalPrice * 100), // Ensure amount is rounded
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            notes: {
                userId: req.user._id.toString(),
            }
        });

        // Create orders in parallel using Promise.all
        const orderPromises = cart.map(item => {
            if (!item.book || !item.quantity) {
                throw new ApiError(400, 'Invalid item in cart');
            }
            console.log(item)
            return Order.create({
                user: req.user._id,
                seller: item.book.owner,
                paymentInfo: {
                    razorpayOrderId: razorpayOrder.id,
                    razorpayPaymentId: 'NOT_PAID_YET', // Temporary value to satisfy schema requirement
                    paymentStatus: "pending"
                },
                orderItems: {
                    book: item.book._id,
                    quantity: item.quantity,
                    price: item.book.price
                },
                totalPriceAfterDiscount: discountedTotalPrice,
                totalPrice: totalPrice,
                orderStatus: "pending"
            });
        });

        await Promise.all(orderPromises);

        return res.status(200).json(new ApiResponse(200, {
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        }, "Razorpay order created successfully"));

    } catch (error) {
        return next(new ApiError(500, `Failed to create order: ${error.message}`));
    }
});

const verifyPayment = asyncHandler(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, 'Missing payment verification parameters');
    }

    try {
        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            throw new ApiError(400, 'Invalid payment signature');
        }

        // Update all orders associated with this razorpay_order_id
        const updateResult = await Order.updateMany(
            {
                'paymentInfo.razorpayOrderId': razorpay_order_id,
                'user': req.user._id
            },
            {
                $set: {
                    'paymentInfo.razorpayPaymentId': razorpay_payment_id,
                    'paymentInfo.paymentStatus': 'successful',
                    'orderStatus': 'confirmed'
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            throw new ApiError(404, 'No orders found to update');
        }

        return res.status(200).json(
            new ApiResponse(200, null, 'Payment verified and orders updated successfully')
        );

    } catch (error) {
        return next(new ApiError(error.statusCode || 500, error.message));
    }
});

const ROLES = {
    USER: 'User',
    ADMIN: 'Admin'
};

const getOrdersByUser = asyncHandler(async (req, res, next) => {
    const { role } = req.body; // Changed to lowercase for consistency
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    try {
        // Validate role
        if (!role || !Object.values(ROLES).includes(role)) {
            throw new ApiError(400, 'Invalid role specified');
        }

        // Validate pagination parameters
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            throw new ApiError(400, 'Invalid pagination parameters');
        }

        // Base query object
        const query = role === ROLES.USER 
            ? { user: req.user._id }
            : { seller: req.user._id };

        // Calculate skip value for pagination
        const skip = (pageNumber - 1) * limitNumber;

        // Prepare sort object
        const sortObject = {};
        sortObject[sortBy] = order === 'desc' ? -1 : 1;

        // Execute queries in parallel
        const [orders, totalCount] = await Promise.all([
            Order.find(query)
                .sort(sortObject)
                .skip(skip)
                .limit(limitNumber)
                .populate('user', 'name email')
                .populate('seller', 'name email')
                .populate('orderItems.book', 'title author price'),
            Order.countDocuments(query)
        ]);

        // Check if any orders exist
        if (!orders || orders.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, {
                    orders: [],
                    pagination: {
                        total: 0,
                        pages: 0,
                        currentPage: pageNumber,
                        perPage: limitNumber,
                        hasMore: false
                    }
                }, 'No orders found')
            );
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limitNumber);
        const hasMore = pageNumber < totalPages;

        // Return response with pagination metadata
        return res.status(200).json(
            new ApiResponse(200, {
                orders,
                pagination: {
                    total: totalCount,
                    pages: totalPages,
                    currentPage: pageNumber,
                    perPage: limitNumber,
                    hasMore
                }
            }, 'Orders fetched successfully')
        );

    } catch (error) {
        return next(
            error instanceof ApiError 
                ? error 
                : new ApiError(500, `Error fetching orders: ${error.message}`)
        );
    }
});

// Helper function to get orders statistics
const getOrdersStats = asyncHandler(async (req, res, next) => {
    const { role } = req.body;
    
    try {
        if (!role || !Object.values(ROLES).includes(role)) {
            throw new ApiError(400, 'Invalid role specified');
        }

        const matchQuery = role === ROLES.USER 
            ? { user: req.user._id }
            : { seller: req.user._id };

        const stats = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$paymentInfo.paymentStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalPriceAfterDiscount' }
                }
            }
        ]);

        const formattedStats = stats.reduce((acc, stat) => {
            acc[stat._id] = {
                count: stat.count,
                totalAmount: stat.totalAmount
            };
            return acc;
        }, {});

        return res.status(200).json(
            new ApiResponse(200, formattedStats, 'Order statistics fetched successfully')
        );

    } catch (error) {
        return next(
            error instanceof ApiError 
                ? error 
                : new ApiError(500, `Error fetching order statistics: ${error.message}`)
        );
    }
});


export {
  createOrder,
  verifyPayment,
  getOrdersByUser,
  getOrdersStats
  }
   