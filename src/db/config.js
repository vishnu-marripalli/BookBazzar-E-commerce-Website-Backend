import mongoose from "mongoose";
import { DBNAME } from "../constants.js";


const Connect_DB= async ()=>{
    try {

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DBNAME}`);
        console.log("Mongodb Connection is Established",connectionInstance.connection.host);

    } catch (error) {

        console.log("Mongodb connection error:",error);
        process.exit(1);
    }
}

export default Connect_DB