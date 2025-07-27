import mongoose, { Schema, Document } from 'mongoose';

export interface NoteVersion {
  noteId: string;
  version: number;
  title: string;
  content: string;
  delta?: any; // Operational transform delta
  createdBy: string;
  createdAt: Date;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  changeDescription?: string;
  collaborators: string[];
  tags?: string[];
  color?: string;
}

export interface NoteVersionDocument extends NoteVersion, Document {
  id: string;
}

const NoteVersionSchema = new Schema<NoteVersionDocument>({
  noteId: {
    type: String,
    required: true,
    index: true,
  },
  version: {
    type: Number,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  delta: {
    type: Schema.Types.Mixed,
    required: false,
  },
  createdBy: {
    type: String,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  changeType: {
    type: String,
    enum: ['create', 'update', 'delete', 'restore'],
    required: true,
  },
  changeDescription: {
    type: String,
    required: false,
  },
  collaborators: [{
    type: String,
    required: false,
  }],
  tags: [{
    type: String,
    required: false,
  }],
  color: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

// Compound index for efficient version queries
NoteVersionSchema.index({ noteId: 1, version: -1 });
NoteVersionSchema.index({ noteId: 1, createdAt: -1 });

// Virtual for formatted change description
NoteVersionSchema.virtual('formattedChangeDescription').get(function(this: NoteVersionDocument) {
  if (this.changeDescription) {
    return this.changeDescription;
  }
  
  switch (this.changeType) {
    case 'create':
      return 'Note created';
    case 'update':
      return 'Note updated';
    case 'delete':
      return 'Note deleted';
    case 'restore':
      return 'Note restored';
    default:
      return 'Note modified';
  }
});

// Ensure virtuals are included in JSON
NoteVersionSchema.set('toJSON', { virtuals: true });

export const NoteVersion = mongoose.model<NoteVersionDocument>('NoteVersion', NoteVersionSchema); 