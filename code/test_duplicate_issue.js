const { TextHasher } = require('./be/utils/TreeAVL');

// Test case: kiểm tra cùng một văn bản
const testText = "Đây là một văn bản test để kiểm tra tính năng phát hiện trùng lặp. Văn bản này có nhiều từ có nghĩa và câu hoàn chỉnh.";

console.log('🧪 Testing duplicate detection issue...');
console.log('Test text:', testText);
console.log('Text length:', testText.length);
console.log('Word count:', testText.split(/\s+/).length);

// Test 1: Kiểm tra calculatePlagiarismRatio với chính nó
console.log('\n📊 Test 1: calculatePlagiarismRatio with itself');
try {
  const result = TextHasher.calculatePlagiarismRatio(testText, testText, true);
  console.log('Result:', result);
  console.log('Ratio:', result.ratio);
  console.log('Matched phrases:', result.matchedPhrases?.length || 0);
  console.log('Total phrases:', result.totalPhrases);
} catch (error) {
  console.error('Error in test 1:', error);
}

// Test 2: Kiểm tra với văn bản tương tự
console.log('\n📊 Test 2: calculatePlagiarismRatio with similar text');
const similarText = "Đây là một văn bản test để kiểm tra tính năng phát hiện trùng lặp. Văn bản này có nhiều từ khác nhau và câu hoàn chỉnh.";
try {
  const result = TextHasher.calculatePlagiarismRatio(testText, similarText, true);
  console.log('Result:', result);
  console.log('Ratio:', result.ratio);
  console.log('Matched phrases:', result.matchedPhrases?.length || 0);
  console.log('Total phrases:', result.totalPhrases);
} catch (error) {
  console.error('Error in test 2:', error);
}

// Test 3: Kiểm tra với văn bản hoàn toàn khác
console.log('\n📊 Test 3: calculatePlagiarismRatio with different text');
const differentText = "Hôm nay trời đẹp, tôi đi chơi công viên với bạn bè. Chúng tôi có một ngày vui vẻ và thú vị.";
try {
  const result = TextHasher.calculatePlagiarismRatio(testText, differentText, true);
  console.log('Result:', result);
  console.log('Ratio:', result.ratio);
  console.log('Matched phrases:', result.matchedPhrases?.length || 0);
  console.log('Total phrases:', result.totalPhrases);
} catch (error) {
  console.error('Error in test 3:', error);
}

// Test 4: Kiểm tra meaningful similarity
console.log('\n📊 Test 4: calculateMeaningfulSimilarity with itself');
try {
  const similarity = TextHasher.calculateMeaningfulSimilarity(testText, testText);
  console.log('Meaningful similarity with itself:', similarity);
} catch (error) {
  console.error('Error in test 4:', error);
}

console.log('\n✅ Test completed');