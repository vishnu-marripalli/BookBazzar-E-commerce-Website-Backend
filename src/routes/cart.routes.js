import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addItemOrUpdateItemQuantity, clearCart, getUserCart, removeItemFromCart } from "../controllers/cart.controller.js";


const router = Router()

router.use(verifyJWT);

router.route('/').get(verifyJWT,getUserCart)
router.route('/clear').delete(clearCart);


router
  .route('/item/:bookId')
  .post(
    
    addItemOrUpdateItemQuantity
  )
  .delete(
   
    removeItemFromCart
  );



export default router;