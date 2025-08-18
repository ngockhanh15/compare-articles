const vietnameseStopwordService = require('./services/VietnameseStopwordService');

async function test() {
  await vietnameseStopwordService.initialize();
  
  console.log('=== Test Stopword Filtering ===');
  
  const text1 = 'tôi yêu em';
  const text2 = 'tôi rất yêu em';
  
  console.log('Original texts:');
  console.log('Text 1:', text1);
  console.log('Text 2:', text2);
  
  console.log('\n=== tokenizeAndFilterUniqueWithPhrases ===');
  const tokens1 = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(text1);
  const tokens2 = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(text2);
  
  console.log('Tokens 1:', tokens1);
  console.log('Tokens 2:', tokens2);
  
  console.log('\n=== extractMeaningfulWords ===');
  const words1 = vietnameseStopwordService.extractMeaningfulWords(text1);
  const words2 = vietnameseStopwordService.extractMeaningfulWords(text2);
  
  console.log('Words 1:', words1);
  console.log('Words 2:', words2);
  
  console.log('\n=== Check if individual words are stopwords ===');
  const allWords = ['tôi', 'yêu', 'em', 'rất'];
  allWords.forEach(word => {
    console.log(`'${word}' is stopword: ${vietnameseStopwordService.isStopword(word)}`);
  });
  
  console.log('\n=== Check tokenizeAndFilterUnique ===');
  const unique1 = vietnameseStopwordService.tokenizeAndFilterUnique(text1);
  const unique2 = vietnameseStopwordService.tokenizeAndFilterUnique(text2);
  
  console.log('Unique 1:', unique1);
  console.log('Unique 2:', unique2);
}

test().catch(console.error);
