import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { publishToQueue } from "../config/rabbitmq.js";
import User from "../model/User.js";
import { generateToken } from "../config/generateToken.js";

export const loginUser = TryCatch(async (req, res) => {
    const { email } = req.body;

    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({ message: "Too many requests. Please wait before requesting new otp." });
        return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, otp, { EX: 300 });
    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    const message = {
        to: email,
        subject: "Your OTP Code",
        body: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
    };

    await publishToQueue("send-otp", message);

    res.status(200).json({ message: "OTP sent to email" });
});

export const verifyUser = TryCatch(async (req, res) => {
    const { email, otp: enteredOtp } = req.body;

    if (!email || !enteredOtp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    console.log(`Verifying OTP for email: ${email}, OTP: ${enteredOtp}`);

    const otpKey = `otp:${email}`;
    
    try {
        // Check Redis connection status
        if (!redisClient.isOpen) {
            console.error("Redis client is not connected");
            return res.status(500).json({ message: "Server error: Redis not connected" });
        }

        const storedOtp = await redisClient.get(otpKey);
        console.log(`Stored OTP for ${email}: ${storedOtp}`);

        if (!storedOtp) {
            console.log(`No OTP found for email: ${email}`);
            return res.status(400).json({ 
                message: "OTP expired or not found. Please request a new OTP." 
            });
        }

        if (storedOtp !== enteredOtp) {
            console.log(`OTP mismatch for ${email}. Expected: ${storedOtp}, Received: ${enteredOtp}`);
            return res.status(400).json({ 
                message: "Invalid OTP. Please check and try again." 
            });
        }

        await redisClient.del(otpKey);
        console.log(`OTP verified and deleted for email: ${email}`);

        let user = await User.findOne({ email });
        if (!user) {
            const name = email.slice(0, 8);
            user = await User.create({ name, email });
            console.log(`New user created: ${email}`);
        }

        const token = generateToken(user);

        res.status(200).json({
            message: "User verified successfully",
            user,
            token,
        });
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ 
            message: "Server error during OTP verification" 
        });
    }
});

export const myProfile = TryCatch(async (req, res) => {
    const user = req.user;
    res.json(user);
});

/*export const updateName= TryCatch(async (req:AuthenticatedRequest, res) => {
const user = await User.findById(req.user?._id)
if(!user) return res.status(404).json({message:"Please login",
});
return;
}
user.name= req.body.name;

await user.save();

const token=  generateToken(user);
res.json{(
    message: "User Updated",
    user,
    token,
)}

 
});*/

export const updateName = TryCatch(async (req, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        return res.status(404).json({
            message: "Please login",
        });
    }

    user.name = req.body.name;
    await user.save();

    const token = generateToken(user);

    res.json({
        message: "User Updated",
        user,
        token,
    });
});

export const getAllUsers = TryCatch(async (req, res) => {
    const users = await User.find();
    res.json(users);
}); 

export const getAUser= TryCatch(async (req, res) => {
    const user= await User.findById(req.params.id);
    res.json(user);
});
