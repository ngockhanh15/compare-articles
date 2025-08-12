const mongoose = require('mongoose');

// Schema cho từ đã được tokenize
const tokenizedWordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true
  },
  hash: {
    type: Number,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['wordTokenizer', 'tokenizer', 'fallback'],
    default: 'wordTokenizer'
  },
  isPreservedPhrase: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: Number,
    default: 1
  }
}, {
  _id: false
});

// Schema cho một node trong AVL tree với token info
const avlNodeSchema = new mongoose.Schema({
  hash: {
    type: Number,
    required: true
  },
  // Thông tin từ gốc
  originalWord: {
    type: String,
    required: false // Allow null for backward compatibility
  },
  // Thông tin tokenization
  tokenInfo: {
    method: {
      type: String,
      enum: ['wordTokenizer', 'tokenizer', 'fallback'],
      default: 'wordTokenizer'
    },
    isPreservedPhrase: {
      type: Boolean,
      default: false
    },
    totalFrequency: {
      type: Number,
      default: 1
    }
  },
  // Documents chứa token này
  documents: [{
    type: String,
    required: true
  }],
  // Sentences chứa token này
  sentences: [{
    type: String,
    required: true
  }],
  // AVL tree properties
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
  _id: false
});

// Schema chính cho Global AVL Tree với tokenized words
const globalAVLTreeSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    default: '2.0.0' // Version mới để phân biệt
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Metadata tổng hợp
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
    },
    // Thống kê tokenization
    tokenStats: {
      totalTokens: {
        type: Number,
        default: 0
      },
      preservedPhrases: {
        type: Number,
        default: 0
      },
      methodDistribution: {
        wordTokenizer: { type: Number, default: 0 },
        tokenizer: { type: Number, default: 0 },
        fallback: { type: Number, default: 0 }
      }
    }
  },
  
  // Lưu trữ tất cả nodes với token info
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
    wordCount: Number,
    // Thống kê tokenization cho document này
    tokenizationStats: {
      totalTokens: Number,
      preservedPhrases: Number,
      uniqueTokens: Number
    }
  }],

  // Lưu trữ các text samples với tokens (cho debug/audit)
  tokenizationSamples: [{
    documentId: String,
    sentenceIndex: Number,
    originalText: String,
    tokenizedWords: [tokenizedWordSchema],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index cho tìm kiếm nhanh
globalAVLTreeSchema.index({ version: 1 });
globalAVLTreeSchema.index({ 'nodes.hash': 1 });
globalAVLTreeSchema.index({ 'nodes.originalWord': 'text' });
globalAVLTreeSchema.index({ lastUpdated: -1 });
globalAVLTreeSchema.index({ 'tokenizationSamples.documentId': 1 });

// Static method để lấy latest tree
globalAVLTreeSchema.statics.getLatest = function() {
  return this.findOne().sort({ lastUpdated: -1 });
};

// Static method để tạo tree mới
globalAVLTreeSchema.statics.createNew = function(treeData) {
  return this.create({
    version: '2.0.0',
    metadata: treeData.metadata,
    nodes: treeData.nodes,
    rootHash: treeData.rootHash,
    documentInfo: treeData.documentInfo,
    tokenizationSamples: treeData.tokenizationSamples || []
  });
};

// Method để update tree
globalAVLTreeSchema.methods.updateTree = function(treeData) {
  this.lastUpdated = new Date();
  this.metadata = treeData.metadata;
  this.nodes = treeData.nodes;
  this.rootHash = treeData.rootHash;
  this.documentInfo = treeData.documentInfo;
  if (treeData.tokenizationSamples) {
    this.tokenizationSamples = treeData.tokenizationSamples;
  }
  return this.save();
};

// Method để thêm tokenization sample
globalAVLTreeSchema.methods.addTokenizationSample = function(sample) {
  this.tokenizationSamples.push(sample);
  // Giữ chỉ 1000 samples gần nhất để tránh database quá lớn
  if (this.tokenizationSamples.length > 1000) {
    this.tokenizationSamples = this.tokenizationSamples.slice(-1000);
  }
  return this.save();
};

// Method để get tokenization statistics
globalAVLTreeSchema.methods.getTokenizationStats = function() {
  const stats = {
    totalSamples: this.tokenizationSamples.length,
    methodDistribution: { wordTokenizer: 0, tokenizer: 0, fallback: 0 },
    preservedPhrasesCount: 0,
    averageTokensPerSentence: 0
  };

  let totalTokens = 0;
  this.tokenizationSamples.forEach(sample => {
    totalTokens += sample.tokenizedWords.length;
    sample.tokenizedWords.forEach(token => {
      stats.methodDistribution[token.method]++;
      if (token.isPreservedPhrase) {
        stats.preservedPhrasesCount++;
      }
    });
  });

  if (this.tokenizationSamples.length > 0) {
    stats.averageTokensPerSentence = totalTokens / this.tokenizationSamples.length;
  }

  return stats;
};

module.exports = mongoose.model('GlobalAVLTree', globalAVLTreeSchema);
