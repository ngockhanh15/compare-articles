const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    trim: true,
    default: ''
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['txt', 'pdf', 'doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt']
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkCount: {
    type: Number,
    default: 0
  },
  lastChecked: {
    type: Date
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'processed', 'failed'],
    default: 'uploading'
  },
  processingError: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ createdAt: -1 }); // For date range queries
documentSchema.index({ fileType: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ title: 'text', description: 'text', author: 'text' });

// Virtual for file extension
documentSchema.virtual('fileExtension').get(function() {
  return this.fileName.split('.').pop().toLowerCase();
});

// Static method to get user documents with pagination
documentSchema.statics.getUserDocuments = function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    search = '',
    fileType = 'all',
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDate = '',
    endDate = ''
  } = options;

  const query = { uploadedBy: userId };

  // Add search filter
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { originalFileName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } }
    ];
  }

  // Add file type filter
  if (fileType !== 'all') {
    query.fileType = fileType;
  }

  // Add status filter
  if (status !== 'all') {
    query.status = status;
  }

  // Add date filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      // Parse startDate and set to beginning of day in UTC
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      query.createdAt.$gte = startDateTime;
      console.log("Start date filter:", startDate, "->", startDateTime);
    }
    if (endDate) {
      // Parse endDate and set to end of day in UTC
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');
      query.createdAt.$lte = endDateTime;
      console.log("End date filter:", endDate, "->", endDateTime);
    }
  }

  console.log("getUserDocuments final query:", JSON.stringify(query, null, 2));

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return this.find(query)
    .populate('uploadedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to get document statistics
documentSchema.statics.getDocumentStats = function(userId) {
  return this.aggregate([
    { $match: { uploadedBy: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$fileType',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' },
        totalChecks: { $sum: '$checkCount' },
        totalDownloads: { $sum: '$downloadCount' }
      }
    }
  ]);
};

// Instance method to increment check count
documentSchema.methods.incrementCheckCount = function() {
  this.checkCount += 1;
  this.lastChecked = new Date();
  return this.save();
};

// Instance method to increment download count
documentSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

// Pre-remove middleware to clean up file
documentSchema.pre('remove', async function() {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    await fs.unlink(this.filePath);
    console.log(`File deleted: ${this.filePath}`);
  } catch (error) {
    console.error(`Error deleting file ${this.filePath}:`, error);
  }
});

module.exports = mongoose.model('Document', documentSchema);