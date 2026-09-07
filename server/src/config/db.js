import mongoose from "mongoose";
import config from "./index.js";

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    autoIndex: config.env !== "production",
  });
  console.log(`[db] connected to MongoDB`);
  return mongoose.connection;
};

export default connectDB;