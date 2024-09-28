import Router from "express";
import passport from 'passport'
import { 
    forgotPasswordRequest,
    refreshAccessToken,
    resendEmailVerification,
    resetForgottenPassword,
    userLogin,
    userLogout,
    userRegister,
    userSelf,
    verifyEmail,
    verifyOtp,
    handleSocialLogin
 } from "../../controllers/auth/user.controller.js";



const router = Router()


router.route('/register').post(userRegister)
router.route('/login').post(userLogin)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/verify-email/:verificationToken').get(verifyEmail)
router.route('/resend-verify-mail').post(resendEmailVerification)
router
  .route('/forgot-password')
  .post(forgotPasswordRequest);
router
    .route('/verify-otp')
    .post(verifyOtp)
router
    .route('/reset-password/:resetToken')
    .post(resetForgottenPassword);



//secure routes
router.route('/logout').get(userLogout)
router.route('/self').get(userSelf)


//SSO routes
router.route('/google').get(
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    }),
    (req, res) => {
      res.send('redirecting to google...');
    }
  );
  router
    .route('/google/callback')
    .get(passport.authenticate('google'), handleSocialLogin);
  

export default router;