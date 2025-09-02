import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import { createClient } from "redis";
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import cors from 'cors';
dotenv.config();
connectDb();
connectRabbitMQ();
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});
console.log("Attempting to connect to Redis...");
redisClient.connect()
  .then(() => {
    console.log("Connected to Redis");
  })
  .catch((error) => {
    console.error("Error connecting to Redis:", error);
    process.exit(1);
  });

const app = express();

// Add JSON body parsing middleware
app.use(express.json());
app.use(cors());

app.use("/api/v1", userRoutes);
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});