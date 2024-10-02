import ApiError from '../../utils/ApiError.js'
import ApiResponse from '../../utils/ApiResponse.js'
import asyncHandler from '../../utils/asyncHandler.js'

import Book from '../models/book.model.js'


const createBook = asyncHandler(async(res,req)=>{
    const {title,author,genre,description,condition,language,price,stock,publishedDate} =req.body;

    
    // Check if user has uploaded a main image
    if (!req.files?.mainImage || !req.files?.mainImage.length) {
        throw new ApiError(400, 'Main image is required');
    }

    const mainImageLocalPath = req.files?.mainImage[0]?.path;
    const mainImage = await uploadOnCloudinary(mainImageLocalPath);

    const subImages = [];
    if (req.files.subImages && req.files.subImages?.length) {
      for (let i = 0; i < req.files.subImages.length; i++) {
        const image = req.files.subImages[i];
        const imageLocalPath = image.path;
        const subImage = await uploadOnCloudinary(imageLocalPath);
        subImages.push({ url: subImage.url, public_id: subImage.public_id });
      }
    }
    const owner = req.user._id;

    const book = await Book.create({
        title,
        author,
        genre,
        description,
        condition,
        language,
        price,
        stock,
        publishedDate,
        mainImage: {
          url: mainImage.url,
          public_id: mainImage.public_id,
        },
        subImages,
      });
      return res
    .status(201)
    .json(new ApiResponse(201, product, 'Product created successfully'));
})





export {

}