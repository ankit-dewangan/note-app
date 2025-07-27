import { Response } from 'express';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth';
import { FileMetadata } from '../models/FileMetadata';
import { logger } from '../utils/logger';

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export const filesController = {
  // Get signed upload URL
  async getUploadUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { filename, originalName, mimeType, size, noteId } = req.body as any;

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = originalName.split('.').pop();
      const s3Key = `uploads/${userId}/${fileId}.${fileExtension}`;

      // Create presigned URL for upload
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: process.env.AWS_ACCESS_KEY_ID!,
        ContentType: mimeType,
        Expires: 3600, // 1 hour
      };

      const presignedUrl = await s3.getSignedUrlPromise('putObject', uploadParams);

      // Create file metadata record
      const fileMetadata = new FileMetadata({
        filename: fileId,
        originalName,
        mimeType,
        size,
        uploadedBy: userId,
        noteId,
        s3Key,
      });

      await fileMetadata.save();

      logger.info(`Upload URL generated for file: ${fileId} by user: ${userId}`);

      res.json({
        success: true,
        data: {
          uploadUrl: presignedUrl,
          fileId: fileMetadata.id,
          s3Key,
        },
      });
    } catch (error) {
      logger.error('Error generating upload URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate upload URL',
      });
    }
  },

  // Get file metadata (global access for collaborative notes)
  async getFileMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const userId = req.user!.id;

      // Allow global access to files (for collaborative notes)
      const fileMetadata = await FileMetadata.findById(id).lean();

      if (!fileMetadata) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      // Generate download URL
      const downloadParams = {
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: process.env.AWS_ACCESS_KEY_ID!,
        Expires: 3600, // 1 hour
      };

      const downloadUrl = await s3.getSignedUrlPromise('getObject', downloadParams);

      res.json({
        success: true,
        data: {
          ...fileMetadata,
          downloadUrl,
        },
      });
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file metadata',
      });
    }
  },

  // Delete file (global access for collaborative notes)
  async deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const userId = req.user!.id;

      // Allow global access to files for collaborative notes
      const fileMetadata = await FileMetadata.findById(id);

      if (!fileMetadata) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      // Delete from S3
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: process.env.AWS_ACCESS_KEY_ID!,
      };

      await s3.deleteObject(deleteParams).promise();

      // Delete metadata from database
      await FileMetadata.deleteOne({ _id: id });

      logger.info(`File deleted: ${id} by user: ${userId}`);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file',
      });
    }
  },

  // Get files by note ID (global access for collaborative notes)
  async getFilesByNoteId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId } = req.params as any;
      const userId = req.user!.id;

      // Allow global access to files for collaborative notes
      const files = await FileMetadata.find({
        noteId,
      }).lean();

      // Generate download URLs for each file
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const downloadParams = {
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: process.env.AWS_ACCESS_KEY_ID!,
            Expires: 3600, // 1 hour
          };

          const downloadUrl = await s3.getSignedUrlPromise('getObject', downloadParams);

          return {
            ...file,
            downloadUrl,
          };
        })
      );

      res.json({
        success: true,
        data: filesWithUrls,
      });
    } catch (error) {
      logger.error('Error fetching files by note ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch files',
      });
    }
  },

  // Create sample files for testing (global access)
  async createSampleFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { noteId } = req.body as any;

      if (!noteId) {
        res.status(400).json({
          success: false,
          error: 'Note ID is required',
        });
        return;
      }

      // Create sample file metadata (without actual file upload)
      const sampleFiles = [
        {
          filename: 'sample-image-1',
          originalName: 'sample-image-1.jpg',
          mimeType: 'image/jpeg',
          size: 1024000, // 1MB
          uploadedBy: userId,
          noteId,
          s3Key: `uploads/${userId}/sample-image-1.jpg`,
        },
        {
          filename: 'sample-document-1',
          originalName: 'sample-document-1.pdf',
          mimeType: 'application/pdf',
          size: 2048000, // 2MB
          uploadedBy: userId,
          noteId,
          s3Key: `uploads/${userId}/sample-document-1.pdf`,
        },
        {
          filename: 'sample-video-1',
          originalName: 'sample-video-1.mp4',
          mimeType: 'video/mp4',
          size: 5120000, // 5MB
          uploadedBy: userId,
          noteId,
          s3Key: `uploads/${userId}/sample-video-1.mp4`,
        },
      ];

      const createdFiles = await FileMetadata.insertMany(sampleFiles);

      logger.info(`Created ${createdFiles.length} sample files for note: ${noteId}`);

      res.json({
        success: true,
        message: 'Sample files created successfully',
        data: createdFiles,
      });
    } catch (error) {
      logger.error('Error creating sample files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create sample files',
      });
    }
  },
}; 