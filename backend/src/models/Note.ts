import mongoose, { Document, Schema } from 'mongoose';

export interface Note {
  title: string;
  content: string; // Encrypted content
  createdBy: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isArchived?: boolean;
  tags?: string[];
  color?: string;
}

export interface NoteDocument extends Note, Document {
  id: string;
  isModified(path: string): boolean;
}

const noteSchema = new Schema<NoteDocument>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
    index: true,
  },
  collaborators: [{
    type: String,
    index: true,
  }],
  version: {
    type: Number,
    default: 1,
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  color: {
    type: String,
    default: '#007AFF',
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
noteSchema.index({ createdBy: 1, isArchived: 1 });
noteSchema.index({ collaborators: 1, isArchived: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ updatedAt: -1 });
noteSchema.index({ title: 'text', content: 'text' });

// Virtual for all participants (creator + collaborators)
noteSchema.virtual('participants').get(function(this: NoteDocument) {
  return [this.createdBy, ...this.collaborators];
});

// Pre-save middleware to increment version
noteSchema.pre('save', function(this: NoteDocument, next: () => void) {
  if (this.isModified('content') || this.isModified('title')) {
    this.version += 1;
  }
  next();
});

export const Note = mongoose.model<NoteDocument>('Note', noteSchema); 