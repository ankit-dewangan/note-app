import mongoose, { Document, Schema } from 'mongoose';

export interface User {
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  encryptionKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends User, Document {
  id: string;
}

const userSchema = new Schema<UserDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  encryptionKey: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.encryptionKey; // Don't expose encryption key in JSON
      return ret;
    },
  },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ id: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function(this: UserDocument) {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.email;
});

export const User = mongoose.model<UserDocument>('User', userSchema); 