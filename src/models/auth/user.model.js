import mongoose from "mongoose";
import { UserRolesEnum,
    AvailableUserRoles,
    UserLoginType,
    AvailableUserRoles,
    USER_TEMPORARY_TOKEN_EXPIRY 
} from "../../constants";

const UserSchema = new mongoose.Schema({
    email:{
        type: String,
        required:true,
        unique:true,
        lowercase:true,
        trim: true,
        index: true,
    },
    password:{
        type: String,
        required:[true,"Password is required"],
    },
    fullName:{
        type:String,
        required:true,
        trim: true, 
        index: true
    },
    role:{
        type:String,
        enum:AvailableUserRoles,
        default:UserRolesEnum.USER,
    },
    loginType: {
        type: String,
        enum: AvailableSocialLogins,
        default: UserLoginType.EMAIL_PASSWORD,
      },
      isEmailVerified: {
        type: Boolean,
        default: false,
      },
      refreshToken: {
        type: String,
      },
      forgotPasswordToken: {
        type: String,
      },
      forgotPasswordExpiry: {
        type: Date,
      },
      emailVerificationToken: {
        type: String,
      },
      emailVerificationExpiry: {
        type: Date,
      },
},{timestamps:true})




// add pre to usemodel bcrypt the password if the password is modified
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
  };


  UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        role: this.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
  };


  UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
      {
        _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
  };


  UserSchema.methods.generateTemporaryToken = function () {
    const unHashedToken = crypto.randomBytes(20).toString('hex');
  
    const hashedToken = crypto
      .createHash('sha256')
      .update(unHashedToken)
      .digest('hex');
    const tokenExpiry = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;
  
    return { unHashedToken, hashedToken, tokenExpiry };
  };



const User = mongoose.model("User",UserSchema);

module.exports = { User };