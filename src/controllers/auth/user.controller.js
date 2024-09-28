import User from '../../models/auth/user.model.js'


import ApiError from '../../utils/ApiError.js'
import ApiResponse from '../../utils/ApiResponse.js'
import asyncHandler from '../../utils/asyncHandler.js'
import { 
    sendMail,
    VerifyemailMailgencontent,
    forgotsendmail
} from '../../utils/nodemailer.js'

import { UserLoginType,USER_OTP_EXPIRY } from '../../constants.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import moment from 'moment'
import passport from 'passport'


const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
}; 


function generateOtp() {
    const currentTime = moment();
    const otp = {};
    otp.otp = Math.floor(100000 + Math.random() * 900000);
    otp.expiryDate = currentTime.add(String(USER_OTP_EXPIRY), 'minutes');
    return otp;
  }

  //To generate access and refresh tokens 
  const generateTokens= async (userid)=>{
    try {
        const user = await User.findById(userid);
        const accessToken =await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
        user.refreshToken = refreshToken;

        await user.save({validateBeforeSave:false})
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            'Something went wrong while generating the access token'
          );
    }

  }

  
  const userRegister=asyncHandler(async (req,res,next)=>{
    
    const {email,password,fullName} = req.body;

    if (!email || !password || !fullName) {
        throw new ApiError(400,'All feilds are requried')
    }

    const existinguser = await User.find({
        email:email
    })
  

    if (existinguser.length>0) {
        throw new ApiError(400,'User Already exists')
    }

    const user = await User.create({
        email,
        password,
        fullName,
        isEmailVerified: false,
        loginType: UserLoginType.EMAIL_PASSWORD,
    })

    const {unHashedToken,hashedToken,tokenExpiry} =await user.generateTemporaryToken();
    /**
   * assign hashedToken and tokenExpiry in DB till user clicks on email verification link
   * The email verification is handled by {@link verifyEmail}
   */
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    await sendMail({
        email: user?.email,
        subject:'Please verify your email',
        mailgenContent:VerifyemailMailgencontent(
            user?.fullName,
            `${process.env.CLIENT_URI}/email-verification/${unHashedToken}`)
    })

    const createdUser = await User.findById(user._id).select(
        '-password  -emailVerificationToken -emailVerificationExpiry'
    )
    if (!createdUser) {
        throw new ApiError(500, 'Something went wrong while registering the user');
      }
      
     return res
     .status(200)
     .json(
        new ApiResponse(200, 
        { user: createdUser },
        'Users registered successfully'
    )
    ) 
  })


  const userLogin=asyncHandler(async (req,res,next)=>{
   const {email,password} = req.body;

   if (!email || !password ) {
    throw new ApiError(400,'All feilds are requried')
    }
    
    const user= await User.findOne({email})

    if (!user) {
        throw new ApiError(404, 'User does not exist')
    }

    if (user.loginType !== UserLoginType.EMAIL_PASSWORD) {
        throw new ApiError(
          400,
          'You have previously registered using ' +
            user.loginType?.toLowerCase() +
            '. Please use the ' +
            user.loginType?.toLowerCase() +
            ' login option to access your account.'
        );
    }

    if (!user.isEmailVerified) {
        throw new ApiError(403,'Email not verified. Please verify your email to log in.')
    }
    
    const isPasswordvaild = await user.isPasswordCorrect(password)
    
    if (!isPasswordvaild) {
        throw new ApiError(
            401,
            'Invaild Password'
        )
    }

    const {accessToken,refreshToken}=await generateTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    )

    
    if (!loggedInUser) {
        throw new ApiError(500, 'Error while fetching user')
    }
    return res
    .status(200)
    .cookie('accesstoken',accessToken,options)
    .cookie('refreshtoken',refreshToken,options)
    .json(new ApiResponse(200 ,
        { user: loggedInUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
        'User logged in successfully'
    ))

  })

  const verifyEmail=asyncHandler(async (req,res,next)=>{
        const {verificationToken }=req.params; //unHashedToken

        if (!verificationToken) {
            throw new ApiError(400, 'Email verification token is missing');
        }

        let hashedToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
        

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpiry: { $gt: Date.now() },
        });


          if (!user) {
            throw new ApiError(489, 'Token is invalid or expired');
        }

        user.isEmailVerified = true;

        // If we found the user that means the token is valid
        // Now we can remove the associated email token and expiry date as we no  longer need them
        user.emailVerificationToken = undefined;
        user.emailVerificationExpiry = undefined;
        await user.save({ validateBeforeSave: false });


        return res
        .status(200)
        .json(new ApiResponse(200,
            {isEmailVerified:true},
            'Email verified'
        ))

  })


  const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      { new: true }
    );
  
    return res
      .status(200)
      .clearCookie('accessToken', options)
      .clearCookie('refreshToken', options)
      .json(new ApiResponse(200, {}, 'User logged out'));
  });
  
  const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
  
    if (!incomingRefreshToken) {
      throw new ApiError(401, 'Unauthorized request');
    }
  
    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      const user = await User.findById(decodedToken?._id);
      if (!user) {
        throw new ApiError(401, 'Invalid refresh token');
      }
  
      // check if incoming refresh token is same as the refresh token attached in the user document
      // This shows that the refresh token is used or not
      // Once it is used, we are replacing it with new refresh token below
      if (incomingRefreshToken !== user?.refreshToken) {
        // If token is valid but is used already
        throw new ApiError(401, 'Refresh token is expired or used');
      }
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      };
  
      const { accessToken, refreshToken: newRefreshToken } =
        await generateTokens(user._id);
  
      return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', newRefreshToken, options)
        .json(
          new ApiResponse(
            200,
            { accessToken, refreshToken: newRefreshToken },
            'Access token refreshed'
          )
        );
    } catch (error) {
      throw new ApiError(401, error?.message || 'Invalid refresh token');
    }
  });


  const resendEmailVerification = asyncHandler(async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, "Email doesn't exits");
        }
        if (user.isEmailVerified) {
            throw new ApiError(400, 'Email is already verified');
        }

        const {unHashedToken,hashedToken,tokenExpiry} =await user.generateTemporaryToken();

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpiry = tokenExpiry;
        await user.save({ validateBeforeSave: false });

        await sendMail({
            email: user?.email,
            subject:'Please verify your email',
            mailgenContent:VerifyemailMailgencontent(
            user?.fullName,
            `${process.env.CLIENT_URI}/email-verification/${unHashedToken}`)
        })
        return res
        .status(200)
        .json(new ApiResponse(200, {}, 'Mail has been sent to your mail ID'));
    });
   
    const forgotPasswordRequest = asyncHandler(async (req, res) => {
        const { email } = req.body;
      
        // Get email from the client and check if user exists
        const user = await User.findOne({ email }).select(
          '+emailVerificationToken +emailVerificationExpiry'
        );
        if (!user) {
          throw new ApiError(404, 'User does not exists', []);
        }
        if (!user.isEmailVerified) {
          throw new ApiError(404, 'User email is not verified');
        }
      
        if (!(user.loginType === UserLoginType.EMAIL_PASSWORD)) {
          throw new ApiError(
            400,
            'You have previously registered using ' +
              user.loginType?.toLowerCase() +
              '. Please use the ' +
              user.loginType?.toLowerCase() +
              ' login option to access your account.'
          );
        }
      
        const { otp, expiryDate } = generateOtp();
      
        user.emailVerificationToken = otp;
        user.emailVerificationExpiry = expiryDate;
      
        // Send mail with the password reset link. It should be the link of the frontend url with token
        await forgotsendmail({
          email: user?.email,
          subject: 'Password reset OTP',
          content: otp,
        });
        await user.save({ validateBeforeSave: false });
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              {},
              'Password reset mail has been sent on your mail id'
            )
        );
    });
    const verifyOtp = asyncHandler(async (req, res) => {
        const { otp, email } = req.body;
      
        const user = await User.findOne({ email }).select(
          '+emailVerificationExpiry +emailVerificationToken'
        );
      
        if (!user) {
          throw new ApiError(404, "User with this email doesn't exits");
        }
        const time1 = moment(user.emailVerificationExpiry);
        const time2 = moment();
      
        const isValidOtp = Number(user.emailVerificationToken) === Number(otp);
        const isEmailExpired = time1.isBefore(time2);
      
        if (isEmailExpired) {
          throw new ApiError(400, 'OTP is Expire!!!');
        } else if (!isValidOtp) {
          throw new ApiError(400, 'OTP is Invalid!!!');
        } else {
          user.emailVerificationExpiry = null;
          user.emailVerificationToken = null;
        }
      
        const { unHashedToken, hashedToken, tokenExpiry } =
          user.generateTemporaryToken(); // generate password reset creds
      
        // save the hashed version a of the token and expiry in the DB
        user.forgotPasswordToken = hashedToken;
        user.forgotPasswordExpiry = tokenExpiry;
        await user.save({ validateBeforeSave: false });
      
        const updatedUser = await User.findById(user._id).select(
          '-forgotPasswordToken -forgotPasswordExpiry -createdAt -updatedAt'
        );
      
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              { token: unHashedToken },
              'OTP verified successfully'
            )
          );
    });


    const resetForgottenPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body;
    
    let hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // See if user with hash similar to resetToken exists
    // If yes then check if token expiry is greater than current date
    
    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: { $gt: Date.now() },
    });
    
    // If either of the one is false that means the token is invalid or expired
    if (!user) {
        throw new ApiError(489, 'Token is invalid or expired');
    }
    
    // if everything is ok and token id valid
    // reset the forgot password token and expiry
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    
    // Set the provided password as the new password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(new ApiResponse(200, {}, 'Password reset successfully'));
    });  

    const userSelf =asyncHandler(async(req,res)=>{
        return res
        .status(200)
        .json(new ApiResponse(200, req.user, 'User fetched successfully'));
    });

    const handleSocialLogin = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user?._id);
      
        if (!user) {
          throw new ApiError(404, 'User does not exist');
        }
      
        const { accessToken, refreshToken } = await  generateTokens(
          user._id
        );
      
        return res
          .status(301)
          .cookie('accessToken', accessToken, options) // set the access token in the cookie
          .cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
          .redirect(
            // redirect user to the frontend with access and refresh token in case user is not using cookies
            `${process.env.CLIENT_SSO_REDIRECT_URL}/${accessToken}/${refreshToken}`
          );
      });

export {
    userRegister,
    userLogin,
    verifyEmail,
    userLogout,
    refreshAccessToken,
    resendEmailVerification,
    forgotPasswordRequest,
    verifyOtp,
    resetForgottenPassword,
    userSelf,
    handleSocialLogin

}