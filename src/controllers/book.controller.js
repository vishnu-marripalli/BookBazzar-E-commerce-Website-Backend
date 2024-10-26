import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import Book from '../models/book.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { getMongoosePaginationOptions } from '../utils/helper.js'


const SortAndFilter = (sortType) => {
  switch (sortType) {
    case 'oldest':
      return { $sort: { createdAt: 1 } }; // Assuming createdAt field exists

    case 'newest':
      return { $sort: { createdAt: -1 } }; // Assuming createdAt field exists

    case 'aToz':
      return { $sort: { title: 1 } }; // Assuming productName field exists

    case 'zToa':
      return { $sort: { title: -1 } }; // Assuming productName field exists
 
    case 'highToLow':
      return { $sort: { price: -1 } }; // Assuming price field exists

    case 'lowToHigh':
      return { $sort: { price: 1 } }; // Assuming price field exists
    default:
      return { $sort: { randomOrder: 1 } }; // Default sorting by randomOrder
  }
};

const createBook = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    genre,
    description,
    condition,
    language,
    price,
    stock,
    publishedDate
  } = req.body;

  // Check if user has uploaded a main image
  if (!req.files?.mainImage || !req.files.mainImage.length) {
    throw new ApiError(400, 'Main image is required');
  }

  const mainImageLocalPath = req.files.mainImage[0].path;
  const mainImage = await uploadOnCloudinary(mainImageLocalPath);

  const subImages = [];
  if (req.files.subImages && req.files.subImages.length) {
    for (const image of req.files.subImages) {
      const subImage = await uploadOnCloudinary(image.path);
      subImages.push({ url: subImage.url, public_id: subImage.public_id });
    }
  }

  const owner = req.user._id;
  // const owner = "VISHNU"

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
    rating:{
      averageRating:4.7,
      totalReviews:120,
    },
    subImages,
    owner
  });

  return res
    .status(201)
    .json(new ApiResponse(201, book, 'Book created successfully'));
})

const getallBooks = asyncHandler(async (req,res)=>{
  const { page = 1, limit = 10, sortType = 'latest' } = req.query;

  const sortStage = SortAndFilter(sortType);
  const bookAggregate = Book.aggregate([
    {
      $match:{}
    },
    {
      $addFields : {   
        randomOrder: { $rand: {}},
      }
    },
    {
      $sort:{
        randomOrder: 1,
      }
    },
    sortStage,
  ])

  const Books = await Book.aggregatePaginate(
    bookAggregate,
    getMongoosePaginationOptions({page,limit})
  )
  return res
  .status(200)
  .json(new ApiResponse(200, Books, 'Books fetched successfully'));

})

const getbookByid = asyncHandler(async(req,res)=>{
  const  {bookId} =req.params;
  const book = await Book.findById(bookId);

  if (!book) {
    throw new ApiError(404, 'Book does not exist');
  }
  return res
  .status(200)
  .json(new ApiResponse(200, book, 'Book fetched successfully'));

})

const deleteBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params;

  const book = await Book.findOneAndDelete({
    _id: bookId,
  });

  if (!book) {
    throw new ApiError(404, 'book does not exist');
  }

  const productImages = [book.mainImage, ...book.subImages];
  productImages.forEach(async (image) => {
    await deleteImageOnCloudinary(image.public_id);
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedbook: book },
        'book deleted successfully'
      )
    );
});


const searchBook = asyncHandler(async (req, res) => {
  const searchQuery = req.query.search?.trim() || '';
  
  // Return early if search query is too short
  if (searchQuery.length < 2) {
    return res.json([]);
  }

  try {
    const books = await Book.find({
      title: { $regex: searchQuery, $options: 'i' }
    })
    .select('title author price') // Select only needed fields
    .limit(10);

    const results = books.map(book => ({
      value: book._id.toString(),
      label: book.title,
      author: book.author || '',
      price: book.price || 0
    }));

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      message: 'Failed to search books'
    });
  }
});
export {
  createBook,
  getallBooks,
  getbookByid,
  deleteBook,
  searchBook
}
 