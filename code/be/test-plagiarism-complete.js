require('dotenv').config();
const documentAVLService = require('./services/DocumentAVLService');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

async function testPlagiarismDetection() {
  try {
    console.log('=== Initializing Services ===');
    
    // Initialize services
    await vietnameseStopwordService.initialize();
    await documentAVLService.initialize();
    
    const stats = documentAVLService.getTreeStats();
    console.log('Tree stats:', stats);
    
    console.log('\n=== Testing Plagiarism Detection ===');
    
    const testTexts = [
      'Tôi yêu em',
      'tôi yêu em',
      'Tôi rất yêu em', 
      'Em yêu anh',
      'Anh yêu em'
    ];
    
    for (const text of testTexts) {
      console.log(`\n--- Testing: "${text}" ---`);
      
      try {
        // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
        const result = await documentAVLService.checkDuplicateContent(text, {
          maxResults: 10
        });
        
        console.log(`Found ${result.matches.length} matches`);
        console.log(`Overall similarity: ${result.overallSimilarity}%`);
        console.log(`Dtotal: ${result.dtotal}%`);
        
        if (result.matches.length > 0) {
          console.log('Top matches:');
          result.matches.slice(0, 3).forEach((match, idx) => {
            console.log(`  ${idx + 1}. ${match.title} (${match.similarity}%)`);
            console.log(`     Duplicate sentences: ${match.duplicateSentences}`);
            if (match.duplicateSentencesDetails && match.duplicateSentencesDetails.length > 0) {
              console.log(`     Sample detail: "${match.duplicateSentencesDetails[0].inputSentence}"`);
              console.log(`     → "${match.duplicateSentencesDetails[0].sourceSentence}"`);
            }
          });
        } else {
          console.log('  No matches found');
        }
        
      } catch (error) {
        console.error(`Error testing "${text}":`, error.message);
      }
    }
    
    console.log('\n=== Token Analysis ===');
    
    // Test tokenization of our specific texts
    const text1 = 'tôi yêu em';
    const text2 = 'tôi rất yêu em';
    
    console.log(`\nTokens for "${text1}":`, vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(text1));
    console.log(`Tokens for "${text2}":`, vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(text2));
    
    // Check what's in the tree
    console.log('\n=== Tree Analysis ===');
    console.log('Documents in tree:', documentAVLService.docInfo.size);
    
    for (const [docId, info] of documentAVLService.docInfo) {
      console.log(`Doc ${docId}: ${info.title}`);
      console.log(`  Sentences: ${info.sentenceCount}, Words: ${info.wordCount}`);
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testPlagiarismDetection();
