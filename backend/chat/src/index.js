import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import chatRoutes from './routes/chat.js';
import cors from "cors";


dotenv.config();

connectDb();

const app= express();

app.use(express.json());
app.use(cors());

app.use("/api/v1", chatRoutes);

const port= process.env.PORT;

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});