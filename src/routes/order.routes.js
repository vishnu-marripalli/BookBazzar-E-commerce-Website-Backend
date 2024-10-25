import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createOrder, getOrdersByUser, verifyPayment } from "../controllers/order.controller.js";

const router = Router()


router.use(verifyJWT)
router.route('/create-order').post(createOrder)
router.route('/verify-payment').post(verifyPayment)
router.route('/orderdetails').post(getOrdersByUser)


export default router;