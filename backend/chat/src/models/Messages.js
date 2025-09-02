import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const schema = new Schema(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: { type: String, required: true },
    text: { type: String },
    image: {
      url: String,
      publicId: String,
    },
    messageType: { type: String,
         enum: ["text", "image"], 
         default: "text" },
    seen: { type: Boolean, 
        default: false },
    seenAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const Messages = mongoose.model("Messages", schema);

export default Messages;
