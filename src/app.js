import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import session from "express-session";
import cors from "cors";


import userRouter from './routes/auth/user.routes.js'


const app = express();
function startApp() {
    app.use(
        cors({
          origin: process.env.CORS_ORIGIN || '*',
          credentials: true,
        })
      );


app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))// configure static file to save images locally
app.use(cookieParser())


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




//routes
app.use('/api/v1/user',userRouter)
};

export { app,startApp  }