export const DBNAME="Bookbazzer"

export const UserRolesEnum = {
    ADMIN: "ADMIN",
    USER: "USER",
  };

  export const BookConditionEnum = {
    NEW: "NEW",
    USED: "USED",
  };



  export const CouponTypeEnum = {
    FLAT: 'FLAT',
    // PERCENTAGE: "PERCENTAGE",
  };
  
  export const AvailableCouponTypes = Object.values(CouponTypeEnum);
  export const USER_OTP_EXPIRY = 2;
  export const AvailableUserRoles = Object.values(UserRolesEnum);
  export const AvailableBookCondition = Object.values(BookConditionEnum);

  export const UserLoginType = {
    GOOGLE: "GOOGLE",
    GITHUB: "GITHUB",
    EMAIL_PASSWORD: "EMAIL_PASSWORD",
  }

  export const AvailableSocialLogins = Object.values(UserLoginType);


  export const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes