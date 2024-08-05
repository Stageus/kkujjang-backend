import mongoose from 'mongoose'

export const chatSchema = new mongoose.Schema(
  {
    userId: Number,
    roomId: String,
    message: String,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)
