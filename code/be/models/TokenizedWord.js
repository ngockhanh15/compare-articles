const mongoose = require('mongoose');

// Schema cho từ đã được tokenize
const tokenizedWordSchema = new mongoose.Schema({
  originalText: {
    type: String,
    required: true
  },
  tokenizedWords: [{
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
    isStopword: {
      type: Boolean,
      default: false
    }
  }],
  documentId: {
    type: String,
    required: true,
    index: true
  },
  sentenceId: {
    type: String,
    required: true,
    index: true
  },
  sentenceIndex: {
    type: Number,
    required: true
  },
  metadata: {
    totalWords: {
      type: Number,
      default: 0
    },
    uniqueWords: {
      type: Number,
      default: 0
    },
    preservedPhrases: {
      type: Number,
      default: 0
    },
    filteredStopwords: {
      type: Number,
      default: 0
    },
    tokenizerUsed: {
      type: String,
      enum: ['wordTokenizer', 'tokenizer', 'fallback'],
      default: 'wordTokenizer'
    }
  }
}, {
  timestamps: true
});

// Indexes cho tìm kiếm nhanh
tokenizedWordSchema.index({ documentId: 1, sentenceIndex: 1 });
tokenizedWordSchema.index({ 'tokenizedWords.word': 1 });
tokenizedWordSchema.index({ 'tokenizedWords.hash': 1 });
tokenizedWordSchema.index({ createdAt: -1 });

// Static method để lấy tokens theo document
tokenizedWordSchema.statics.getTokensByDocument = function(documentId) {
  return this.find({ documentId }).sort({ sentenceIndex: 1 });
};

// Static method để tìm documents chứa word
tokenizedWordSchema.statics.findDocumentsWithWord = function(word) {
  return this.find({ 'tokenizedWords.word': word }).distinct('documentId');
};

// Static method để get statistics
tokenizedWordSchema.statics.getTokenStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSentences: { $sum: 1 },
        totalDocuments: { $addToSet: '$documentId' },
        totalWords: { $sum: '$metadata.totalWords' },
        totalUniqueWords: { $sum: '$metadata.uniqueWords' },
        totalPreservedPhrases: { $sum: '$metadata.preservedPhrases' },
        totalFilteredStopwords: { $sum: '$metadata.filteredStopwords' }
      }
    },
    {
      $project: {
        _id: 0,
        totalSentences: 1,
        totalDocuments: { $size: '$totalDocuments' },
        totalWords: 1,
        totalUniqueWords: 1,
        totalPreservedPhrases: 1,
        totalFilteredStopwords: 1
      }
    }
  ]);
};

// Method để thêm tokens cho sentence
tokenizedWordSchema.methods.addTokensForSentence = function(tokens, metadata) {
  this.tokenizedWords = tokens;
  this.metadata = metadata;
  return this.save();
};

module.exports = mongoose.model('TokenizedWord', tokenizedWordSchema);
