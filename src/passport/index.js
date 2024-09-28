import passport from 'passport'
import Strategy from 'passport-google-oauth20'
import User from '../models/auth/user.model.js'

import { UserLoginType,UserRolesEnum } from '../constants.js'
import ApiError from '../utils/ApiError.js'


try {
    //This function determines what user data should be stored in the session. In this case, the user's _id is stored.
    passport.serializeUser((user, next) => {
        next(null, user._id);
    });

    //This function retrieves user information from the database based on the _id stored in the session.
    passport.deserializeUser(async (id, next) => {
        try {
          const user = await User.findById(id);
          if (user)
            next(null, user); // return user of exist
          else next(new ApiError(404, 'User does not exist'), null); // throw an error if user does not exist
        } catch (error) {
          next(
            new ApiError(
              500,
              'Something went wrong while deserializing the user. Error: ' + error
            ),
            null
          );
        }
    });
    
    passport.use(
        new Strategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
          },
          async (_, __, profile, next) => {
            const user = await User.findOne({ email: profile._json.email });
            if (user) {
                // if user exists, check if user has registered with the GOOGLE SSO
                if (user.loginType !== UserLoginType.GOOGLE) {
                  // If user is registered with some other method, we will ask him/her to use the same method as registered.
                  // TODO: We can redirect user to appropriate frontend urls which will show users what went wrong instead of sending response from the backend
                  next(
                    new ApiError(
                      400,
                      'You have previously registered using ' +
                        user.loginType?.toLowerCase()?.split('_').join(' ') +
                        '. Please use the ' +
                        user.loginType?.toLowerCase()?.split('_').join(' ') +
                        ' login option to access your account.'
                    ),
                    null
                  );
                  // next(null, false, {
                  //   message:
                  //     'You have previously registered using ' +
                  //     user.loginType?.toLowerCase()?.split('_').join(' ') +
                  //     '. Please use the ' +
                  //     user.loginType?.toLowerCase()?.split('_').join(' ') +
                  //     ' login option to access your account.',
                  //   redirectTo: `${process.env.CLIENT_URI}/error`, // Adjust this URL as needed
                  // });
                }else {
                    // If user is registered with the same login method we will send the saved user
                    next(null, user);
                  }
            }else {
                // If user with email does not exists, means the user is coming for the first time
                const createdUser = await User.create({
                  email: profile._json.email,
                  // There is a check for traditional logic so the password does not matter in this login method
                  password: profile._json.sub, // Set user's password as sub (coming from the google)
                  isEmailVerified: true, // email will be already verified
                  role: UserRolesEnum.USER,
                  loginType: UserLoginType.GOOGLE,
                });
                if (createdUser) {
                  next(null, createdUser);
                } else {
                  next(new ApiError(500, 'Error while registering the user'), null);
                }
            }
          }
        ))
} catch (error) {
    console.error('PASSPORT ERROR: ', error);
}