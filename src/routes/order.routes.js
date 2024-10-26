import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createOrder, getOrdersByUser, getOrdersStats, verifyPayment } from "../controllers/order.controller.js";

const router = Router()


router.use(verifyJWT)
router.route('/create-order').post(createOrder)
router.route('/verify-payment').post(verifyPayment)
router.route('/orderdetails').post(getOrdersByUser)
router.route('/orderstats').post(getOrdersStats)


export default router;