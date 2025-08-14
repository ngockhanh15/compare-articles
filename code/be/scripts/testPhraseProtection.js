const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function testPhraseProtection() {
  console.log('🚀 Testing Vietnamese Stopword Service with Phrase Protection');
  
  try {
    // Khởi tạo service
    await vietnameseStopwordService.initialize();
    
    // Test cases
    const testTexts = [
      'Tôi thích xem thể thao và đọc báo về kinh tế',
      'Công nghệ thông tin và trí tuệ nhân tạo đang phát triển',
      'Bài viết về y tế và sức khỏe rất hữu ích',
      'Mạng xã hội ảnh hưởng đến đời sống xã hội',
      'Học máy và big data là xu hướng công nghệ mới'
    ];
    
    console.log('\n📊 Testing different tokenization methods:');
    console.log('='.repeat(60));
    
    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      console.log(`\n${i+1}. Text: "${text}"`);
      
      // Method 1: tokenizeWithWordTokenizer (new method - automatic phrase detection)
      console.log('\n   🤖 With Word Tokenizer (Auto Phrase Detection):');
      const withWordTokenizer = vietnameseStopwordService.tokenizeWithWordTokenizer(text);
      console.log('   ', withWordTokenizer);
      
      // Method 2: tokenizeWithPhraseProtection (manual phrase protection)
      console.log('\n   � With Manual Phrase Protection:');
      const withProtection = vietnameseStopwordService.tokenizeWithPhraseProtection(text);
      console.log('   ', withProtection);
      
      // Method 3: tokenizeAndFilterUnique (old method)
      console.log('\n   📝 Without Phrase Protection (Old Method):');
      const withoutProtection = vietnameseStopwordService.tokenizeAndFilterUnique(text);
      console.log('   ', withoutProtection);
      
      // Method 4: extractMeaningfulWords (improved)
      console.log('\n   📝 Extract Meaningful Words:');
      const meaningful = vietnameseStopwordService.extractMeaningfulWords(text);
      console.log('   ', meaningful);
      
      // Method 5: removeStopwords (improved)
      console.log('\n   📝 Remove Stopwords:');
      const removed = vietnameseStopwordService.removeStopwords(text);
      console.log('   ', removed);
      
      console.log('\n' + '-'.repeat(60));
    }
    
    // Test phrase protection functionality
    console.log('\n🔒 Testing Phrase Protection Functions:');
    console.log('='.repeat(60));
    
    const testText = 'Nghiên cứu về trí tuệ nhân tạo và học máy trong y tế';
    console.log(`\nOriginal text: "${testText}"`);
    
    const { text: protected, mappings } = vietnameseStopwordService.protectPhrases(testText);
    console.log(`Protected text: "${protected}"`);
    console.log('Mappings:', Array.from(mappings.entries()));
    
    const restored = vietnameseStopwordService.restorePhrases(protected, mappings);
    console.log(`Restored text: "${restored}"`);
    
    // Test preserved phrases management
    console.log('\n📚 Testing Preserved Phrases Management:');
    console.log('='.repeat(60));
    
    const allPhrases = vietnameseStopwordService.getAllPreservedPhrases();
    console.log('\nCustom preserved phrases:', allPhrases.customPhrases.slice(0, 10));
    console.log('Stopword phrases:', allPhrases.stopwordPhrases.slice(0, 10));
    
    // Test adding new phrase
    vietnameseStopwordService.addPreservedPhrase('machine learning');
    console.log('\n✅ Added "machine learning" to preserved phrases');
    
    console.log('Is "thể thao" preserved?', vietnameseStopwordService.isPreservedPhrase('thể thao'));
    console.log('Is "machine learning" preserved?', vietnameseStopwordService.isPreservedPhrase('machine learning'));
    
    // Test with new phrase
    const testWithNew = 'Machine learning và thể thao là hai lĩnh vực khác nhau';
    console.log(`\nTesting with new phrase: "${testWithNew}"`);
    const tokensWithNew = vietnameseStopwordService.tokenizeWithWordTokenizer(testWithNew);
    console.log('Tokens (Word Tokenizer):', tokensWithNew);
    
    const tokensWithProtection = vietnameseStopwordService.tokenizeWithPhraseProtection(testWithNew);
    console.log('Tokens (With Protection):', tokensWithProtection);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
if (require.main === module) {
  testPhraseProtection();
}

module.exports = testPhraseProtection;
