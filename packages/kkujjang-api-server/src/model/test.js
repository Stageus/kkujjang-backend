import mongoose from 'mongoose'

export const testSchema = new mongoose.Schema(
  {
    content: String,
  },
  {
    timestamps: {
      createdAt: 'created_at',
    },
  },
)
