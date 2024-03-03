import mongoose from 'mongoose'

export const chatSchema = new mongoose.Schema(
  {
    userId: Number,
    message: String,
  },
  {
    timestamps: {
      createdAt: 'created_at',
    },
  },
)
