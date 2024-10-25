// import passport from 'passport';
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// import User from '../models/auth/user.model.js';
// import { UserLoginType, UserRolesEnum } from '../constants.js';
// import ApiError from '../utils/ApiError.js';

// try {
//   // Serialize user to save the _id in the session
//   passport.serializeUser((user, next) => {
//     next(null, user._id);
//   });

//   // Deserialize user by retrieving the user from the DB using the _id stored in the session
//   passport.deserializeUser(async (id, next) => {
//     try {
//       const user = await User.findById(id);
//       if (user) {
//         next(null, user);
//       } else {
//         next(new ApiError(404, 'User does not exist'), null);
//       }
//     } catch (error) {
//       next(new ApiError(500, `Deserialization Error: ${error.message}`), null);
//     }
//   });

//   // Google OAuth Strategy setup
//   passport.use(
//     new GoogleStrategy(
//       {
//         clientID: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         callbackURL: process.env.GOOGLE_CALLBACK_URL,
//       },
//       async (accessToken, refreshToken, profile, next) => {
//         try {
//           const existingUser = await User.findOne({ email: profile._json.email });

//           if (existingUser) {
//             // User exists, check login type
//             if (existingUser.loginType !== UserLoginType.GOOGLE) {
//               return next(
//                 new ApiError(
//                   400,
//                   `You have previously registered using ${existingUser.loginType?.toLowerCase()?.replace('_', ' ')}. Please use that login method to access your account.`
//                 )
//               );
//             }
//             // If login method is correct, proceed
//             return next(null, existingUser);
//           }

//           // User does not exist, create a new account
//           const newUser = new User({
//             email: profile._json.email,
//             password: null, // Leave password null or handle differently since it's OAuth
//             isEmailVerified: true, // Since Google verifies the email
//             role: UserRolesEnum.USER,
//             loginType: UserLoginType.GOOGLE,
//           });

//           const savedUser = await newUser.save();
//           return next(null, savedUser);
//         } catch (error) {
//           return next(new ApiError(500, `Authentication Error: ${error.message}`), null);
//         }
//       }
//     )
//   );
// } catch (error) {
//   console.error('PASSPORT ERROR:', error);
// }
