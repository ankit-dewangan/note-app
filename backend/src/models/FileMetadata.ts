import mongoose, { Document, Schema } from 'mongoose';

export interface FileMetadata {   
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  noteId?: string;
  s3Key: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileMetadataDocument extends FileMetadata, Document {
  id: string;
}

const fileMetadataSchema = new Schema<FileMetadataDocument>({
  filename: {
    type: String,
    required: true,
    unique: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
    min: 0,
  },
  uploadedBy: {
    type: String,
    required: true,
    index: true,
  },
  noteId: {
    type: String,
    index: true,
  },
  s3Key: {
    type: String,
    required: true,
    unique: true,
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
fileMetadataSchema.index({ uploadedBy: 1 });
fileMetadataSchema.index({ noteId: 1 });
fileMetadataSchema.index({ createdAt: -1 });
fileMetadataSchema.index({ mimeType: 1 });

// Virtual for file extension
fileMetadataSchema.virtual('extension').get(function(this: FileMetadataDocument) {
  return this.originalName.split('.').pop()?.toLowerCase();
});

// Virtual for formatted file size
fileMetadataSchema.virtual('formattedSize').get(function(this: FileMetadataDocument) {
  const bytes = this.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

export const FileMetadata = mongoose.model<FileMetadataDocument>('FileMetadata', fileMetadataSchema); 