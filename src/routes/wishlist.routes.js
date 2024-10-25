import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createAndAddItemToWishlist, getWishlist, removebookFromWishlist } from "../controllers/wishlist.controller.js";


const router = Router()

router.use(verifyJWT);

router.route('/').get(getWishlist)


router
  .route('/:bookId')
  .post(
    
    createAndAddItemToWishlist
  )
  .delete(
   
    removebookFromWishlist
  );

  export default router;
