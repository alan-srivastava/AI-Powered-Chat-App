import mongoose from "mongoose";

const connectDb = async () => {
    const url = process.env.MONGO_URI;
    
    if (!url) {
        console.error("❌ MONGO_URI environment variable is not defined");
        console.log("💡 Please check your .env file and ensure MONGO_URI is set");
        throw new Error("Mongo URI is not defined");
    }

    console.log("🔗 Attempting to connect to MongoDB...");
    console.log(`📝 Connection URL: ${url.replace(/:[^:]*@/, ':****@')}`); // Mask password
    
    try {
        await mongoose.connect(url, {
            dbName: "Chatappmicroserviceapp",
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 45000, // 45 second socket timeout
            connectTimeoutMS: 10000, // 10 second connection timeout
        });
        
        console.log("✅ Successfully connected to MongoDB");
        
        // Add event listeners for better debugging
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });
        
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:");
        console.error("   - Check if MongoDB is running");
        console.error("   - Verify your connection string in .env file");
        console.error("   - Ensure network connectivity");
        console.error("   - Error details:", error.message);
        
        // Don't exit immediately, let the application continue but log the error
        throw error;
    }
};

export default connectDb;
