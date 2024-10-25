import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import session from "express-session";
import cors from "cors";
import bodyParser from 'body-parser'

import userRouter from './routes/auth/user.routes.js'
import bookRouter from './routes/book.routes.js'
import cartRouter from './routes/cart.routes.js'
import wishlistRouter from './routes/wishlist.routes.js'
import orderRouter from './routes/order.routes.js'

import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './models/auth/user.model.js';
import { UserLoginType, UserRolesEnum } from './constants.js';
import ApiError from './utils/ApiError.js';
const app = express();
function startApp() {
    app.use(
        cors({
          origin:  "https://bookbazzar-backend.onrender.com",
          credentials: true,
        })
      );


app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({extended: true,limit: '10mb' }))
app.use(express.static("public"))// configure static file to save images locally
app.use(cookieParser())
app.use(bodyParser.json());


 // required for passport
 app.use(
    session({
      secret: process.env.EXPRESS_SESSION_SECRET,
      resave: true,
      saveUninitialized: true,
    })
  );

  // session secret
  app.use(passport.initialize());
  app.use(passport.session());

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Set up Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ email: profile._json.email });

        if (existingUser) {
          if (existingUser.loginType !== UserLoginType.GOOGLE) {
            return done(
              new ApiError(
                400,
                `You have previously registered using ${existingUser.loginType?.toLowerCase()?.replace('_', ' ')}. Please use that login method to access your account.`
              )
            );
          }
          return done(null, existingUser);
        }

        const newUser = new User({
          email: profile._json.email,
          password: profile._json.sub, // Set user's password as sub (coming from the google)
          fullName: profile._json.email?.split('@')[0],
          isEmailVerified: true,
          role: UserRolesEnum.USER,
          loginType: UserLoginType.GOOGLE,
        });

        const savedUser = await newUser.save();
        return done(null, savedUser);
      } catch (error) {
        return done(new ApiError(500, `Authentication Error: ${error.message}`), null);
      }
    }
  )
);


//routes
app.use('/api/v1/user',userRouter)
app.use('/api/v1/book',bookRouter)
app.use('/api/v1/cart',cartRouter)
app.use('/api/v1/wishlist',wishlistRouter)
app.use('/api/v1/order',orderRouter)
};

export { app,startApp  }