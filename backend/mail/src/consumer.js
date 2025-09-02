import amqp from "amqplib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const startSendOtpConsumer = async () => {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.Rabbitmq_Host,
      port: 5672,
      username: process.env.Rabbitmq_User,
      password: process.env.Rabbitmq_Password,
    });

    const channel = await connection.createChannel();
    await channel.assertQueue("send-otp", { durable: true });
    console.log("✅ Mail Service consumer started, listening for otp emails");

    channel.consume("send-otp", async (msg) => {
      if (msg !== null) {
        try {
          const { to, subject, body } = JSON.parse(msg.content.toString());
          console.log(`Received OTP request for email: ${to}, Body: ${body}`);

          // Setup nodemailer transporter
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              user: process.env.USER,
              pass: process.env.PASSWORD,
            },
          });

          await transporter.sendMail({
            from: `"Chat App" <${process.env.USER}>`,
            to,
            subject,
            text: body,
          });

          console.log(`✅ OTP email sent to ${to}`);
          channel.ack(msg);
        } catch (error) {
          console.error("❌ Failed to send OTP", error);
          channel.nack(msg, false, false); // discard bad messages
        }
      }
    });
  } catch (error) {
    console.error("❌ Failed to start RabbitMQ consumer", error);
  }
};