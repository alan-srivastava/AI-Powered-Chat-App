import express from 'express';
import dotenv from 'dotenv';
//const { startSendOtpConsumer } = require("./consumer.js");
import { startSendOtpConsumer } from "./consumer.js";

dotenv.config();
startSendOtpConsumer();

const app = express();

app.listen(process.env.PORT, () => {
    console.log(`Mail service listening on port ${process.env.PORT}`);
});
