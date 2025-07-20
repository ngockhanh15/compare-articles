const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testPlagiarismRatio() {
  console.log('=== Test Plagiarism Ratio ===\n');

  // Khởi tạo stopword service
  try {
    await vietnameseStopwordService.initialize();
    console.log('Stopword service initialized successfully\n');
  } catch (error) {
    console.error('Failed to initialize stopword service:', error);
    return;
  }

  const sentence1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const sentence2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";

  console.log(`Source text (sentence1): "${sentence1}"`);
  console.log(`Check text (sentence2): "${sentence2}"`);
  console.log('---\n');

  // Test plagiarism ratio với stopwords
  console.log('=== Plagiarism Ratio (with stopwords filtering) ===');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(sentence1, sentence2, true);
  
  console.log(`Plagiarism Ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`Details: ${plagiarismResult.details}`);
  console.log(`Source words (${plagiarismResult.totalWords}): [${plagiarismResult.sourceWordsList.join(', ')}]`);
  console.log(`Check words (${plagiarismResult.sourceWords}): [${plagiarismResult.checkWordsList.join(', ')}]`);
  console.log(`Matched words (${plagiarismResult.matchedWords.length}): [${plagiarismResult.matchedWordsList.join(', ')}]`);
  console.log('---\n');

  // Test ngược lại (sentence2 làm source, sentence1 làm check)
  console.log('=== Plagiarism Ratio (reversed) ===');
  const reversedResult = TextHasher.calculatePlagiarismRatio(sentence2, sentence1, true);
  
  console.log(`Plagiarism Ratio (reversed): ${reversedResult.ratio.toFixed(2)}%`);
  console.log(`Details: ${reversedResult.details}`);
  console.log(`Source words (${reversedResult.totalWords}): [${reversedResult.sourceWordsList.join(', ')}]`);
  console.log(`Check words (${reversedResult.sourceWords}): [${reversedResult.checkWordsList.join(', ')}]`);
  console.log(`Matched words (${reversedResult.matchedWords.length}): [${reversedResult.matchedWordsList.join(', ')}]`);
  console.log('---\n');

  // Test với câu tương tự hơn
  console.log('=== Test with More Similar Sentences ===');
  const similar1 = "Tôi ưa thích thể thao đặc biệt là đá bóng";
  const similar2 = "Thể thao đặc biệt đá bóng là môn tôi ưa thích";
  
  console.log(`Similar 1: "${similar1}"`);
  console.log(`Similar 2: "${similar2}"`);
  
  const similarResult = TextHasher.calculatePlagiarismRatio(similar1, similar2, true);
  console.log(`Plagiarism Ratio: ${similarResult.ratio.toFixed(2)}%`);
  console.log(`Details: ${similarResult.details}`);
  console.log(`Matched words: [${similarResult.matchedWordsList.join(', ')}]`);
  console.log('---\n');

  // Test duplicate detection với plagiarism ratio
  console.log('=== Duplicate Detection (using Plagiarism Ratio) ===');
  const thresholds = [50, 60, 70, 80, 90];
  
  console.log('Original sentences:');
  thresholds.forEach(threshold => {
    const result = TextHasher.isDuplicate(sentence1, sentence2, threshold, true);
    console.log(`  Threshold ${threshold}%: ${result.isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${result.similarity.toFixed(2)}%)`);
  });
  
  console.log('\nSimilar sentences:');
  thresholds.forEach(threshold => {
    const result = TextHasher.isDuplicate(similar1, similar2, threshold, true);
    console.log(`  Threshold ${threshold}%: ${result.isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${result.similarity.toFixed(2)}%)`);
  });
}

// Run test
testPlagiarismRatio().catch(console.error);