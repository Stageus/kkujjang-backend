import mongoose from 'mongoose'

const defaultSchema = {
  type: String,
  roomId: String,
}

export const userEnterSchema = new mongoose.Schema(
  {
    ...defaultSchema,
    userId: Number,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const userLeaveSchema = new mongoose.Schema(
  {
    ...defaultSchema,
    userId: Number,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const createRoomSchema = new mongoose.Schema(
  {
    ...defaultSchema,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const expireRoomSchema = new mongoose.Schema(
  {
    ...defaultSchema,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const sayWordSchema = new mongoose.Schema(
  {
    ...defaultSchema,
    userId: Number,
    word: String,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const gameStartSchema = new mongoose.Schema(
  {
    ...defaultSchema,
    userList: Array,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const gameEndSchema = new mongoose.Schema(
  {
    ...defaultSchema,
    userList: Array,
    ranking: Array,
  },
  {
    timestamps: {
      createdAt: 'createdAt',
    },
  },
)

export const roomSchema = new mongoose.Schema({}, { strict: false })
