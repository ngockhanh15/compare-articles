const mongoose = require('mongoose');

// Schema cho một node trong AVL tree
const avlNodeSchema = new mongoose.Schema({
  hash: {
    type: Number,
    required: true
  },
  documents: [{
    type: String,
    required: true
  }],
  sentences: [{
    type: String,
    required: true
  }],
  height: {
    type: Number,
    default: 1
  },
  leftHash: {
    type: Number,
    default: null
  },
  rightHash: {
    type: Number,
    default: null
  }
}, {
  _id: false // Không cần _id riêng cho từng node
});

// Schema chính cho Global AVL Tree
const globalAVLTreeSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    totalNodes: {
      type: Number,
      default: 0
    },
    totalDocuments: {
      type: Number,
      default: 0
    },
    totalSentences: {
      type: Number,
      default: 0
    },
    treeHeight: {
      type: Number,
      default: 0
    }
  },
  // Lưu trữ tất cả nodes của tree dưới dạng flat array
  nodes: [avlNodeSchema],
  
  // Root node hash để rebuild tree structure
  rootHash: {
    type: Number,
    default: null
  },
  
  // Document metadata
  documentInfo: [{
    documentId: {
      type: String,
      required: true
    },
    title: String,
    fileType: String,
    createdAt: Date,
    uploadedBy: String,
    sentenceCount: Number,
    wordCount: Number
  }]
}, {
  timestamps: true
});

// Index cho tìm kiếm nhanh
globalAVLTreeSchema.index({ version: 1 });
globalAVLTreeSchema.index({ 'nodes.hash': 1 });
globalAVLTreeSchema.index({ lastUpdated: -1 });

// Static method để lấy latest tree
globalAVLTreeSchema.statics.getLatest = function() {
  return this.findOne().sort({ lastUpdated: -1 });
};

// Static method để tạo tree mới
globalAVLTreeSchema.statics.createNew = function(treeData) {
  return this.create({
    version: '1.0.0',
    metadata: treeData.metadata,
    nodes: treeData.nodes,
    rootHash: treeData.rootHash,
    documentInfo: treeData.documentInfo
  });
};

// Method để update tree
globalAVLTreeSchema.methods.updateTree = function(treeData) {
  this.lastUpdated = new Date();
  this.metadata = treeData.metadata;
  this.nodes = treeData.nodes;
  this.rootHash = treeData.rootHash;
  this.documentInfo = treeData.documentInfo;
  return this.save();
};

module.exports = mongoose.model('GlobalAVLTree', globalAVLTreeSchema);
