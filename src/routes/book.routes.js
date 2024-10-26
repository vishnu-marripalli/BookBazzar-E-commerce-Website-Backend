import Router from "express";
import { createBook, deleteBook, getallBooks, getbookByid, searchBook} from "../controllers/book.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from '../middlewares/multer.middleware.js'

const router = Router()

router.route('/search').get(searchBook)
router.route('/create').post(
  verifyJWT,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 5 }
  ]),
  createBook
)
router.route('/').get(getallBooks)
router.route('/:bookId')
.get(getbookByid).delete(verifyJWT,deleteBook)


export default router;
