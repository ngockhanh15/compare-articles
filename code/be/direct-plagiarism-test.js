require('dotenv').config();
const mongoose = require('mongoose');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');
const Document = require('./models/Document');

async function directPlagiarismTest() {
  try {
    console.log('=== Direct Plagiarism Test ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    await vietnameseStopwordService.initialize();
    
    console.log('Connected to database and initialized stopword service');
    
    // Get all documents
    const documents = await Document.find({}).select('title extractedText');
    console.log(`Found ${documents.length} documents in database:`);
    
    documents.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.title}: "${doc.extractedText}"`);
    });
    
    console.log('\n=== Manual Similarity Check ===');
    
    const inputText = 'tôi yêu em';
    console.log(`Input text: "${inputText}"`);
    
    // Tokenize input
    const inputTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(inputText);
    console.log(`Input tokens: [${inputTokens.join(', ')}]`);
    
    // Check against each document
    for (const doc of documents) {
      console.log(`\n--- Checking against: ${doc.title} ---`);
      console.log(`Document text: "${doc.extractedText}"`);
      
      // Tokenize document
      const docTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(doc.extractedText);
      console.log(`Document tokens: [${docTokens.join(', ')}]`);
      
      // Find common tokens
      const commonTokens = inputTokens.filter(token => docTokens.includes(token));
      console.log(`Common tokens: [${commonTokens.join(', ')}]`);
      
      // Calculate similarity
      const similarity = inputTokens.length > 0 ? (commonTokens.length / inputTokens.length) * 100 : 0;
      console.log(`Similarity: ${similarity.toFixed(2)}% (${commonTokens.length}/${inputTokens.length})`);
      
      if (similarity >= 50) {
        console.log('🎯 MATCH FOUND! This should be detected as plagiarism');
      } else {
        console.log('❌ No match (below 50% threshold)');
      }
    }
    
    console.log('\n=== Sentence-Level Analysis ===');
    
    // Test sentence extraction
    const TextHasher = require('./utils/TreeAVL').TextHasher;
    
    const inputSentences = TextHasher.extractSentences(inputText);
    console.log(`Input sentences: [${inputSentences.join(' | ')}]`);
    
    for (const doc of documents) {
      const docSentences = TextHasher.extractSentences(doc.extractedText);
      console.log(`\n${doc.title} sentences: [${docSentences.join(' | ')}]`);
      
      // Check each input sentence against each doc sentence  
      for (let i = 0; i < inputSentences.length; i++) {
        const inputSentence = inputSentences[i];
        const inputSentenceTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(inputSentence);
        
        console.log(`  Input sentence ${i + 1}: "${inputSentence}" → [${inputSentenceTokens.join(', ')}]`);
        
        for (let j = 0; j < docSentences.length; j++) {
          const docSentence = docSentences[j];
          const docSentenceTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(docSentence);
          
          const commonSentenceTokens = inputSentenceTokens.filter(token => docSentenceTokens.includes(token));
          const sentenceSimilarity = inputSentenceTokens.length > 0 ? (commonSentenceTokens.length / inputSentenceTokens.length) * 100 : 0;
          
          if (sentenceSimilarity >= 50) {
            console.log(`    ✅ Match with doc sentence ${j + 1}: "${docSentence}" (${sentenceSimilarity.toFixed(2)}%)`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

directPlagiarismTest();
