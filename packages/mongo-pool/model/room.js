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
      createdAt: 'enteredAt',
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
      createdAt: 'leavedAt',
    },
  },
)

export const createRoomSchema = new mongoose.Schema(
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

export const expireRoomSchema = new mongoose.Schema(
  {
    ...defaultSchema,
  },
  {
    timestamps: {
      createdAt: 'expiredAt',
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
      createdAt: 'saidAt',
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
      createdAt: 'startedAt',
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
      createdAt: 'endedAt',
    },
  },
)

export const roomSchema = new mongoose.Schema({}, { strict: false })
