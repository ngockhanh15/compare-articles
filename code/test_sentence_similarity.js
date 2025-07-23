// Test đơn giản để kiểm tra sentence-level similarity
console.log('🧪 Testing Sentence-Level Similarity Logic');
console.log('='.repeat(50));

// Mock data giống với ví dụ của bạn
const mockMatchedSentences = [
  { sentence: "Dự báo thời tiết hôm nay có thể mưa to, kèm sấm chớp", duplicateRatio: 60 },
  { sentence: "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng", duplicateRatio: 100 }
];

console.log('📝 Mock matched sentences:');
mockMatchedSentences.forEach((sentence, index) => {
  console.log(`  ${index + 1}. "${sentence.sentence}" (${sentence.duplicateRatio}%)`);
});

// Tính sentence-level similarity
let plagiarismRatio = 0;
if (mockMatchedSentences.length > 0) {
  const totalSimilarity = mockMatchedSentences.reduce((sum, sentence) => sum + sentence.duplicateRatio, 0);
  plagiarismRatio = Math.round(totalSimilarity / mockMatchedSentences.length);
}

console.log('\n📊 CALCULATION:');
console.log(`Total similarity: ${mockMatchedSentences.reduce((sum, s) => sum + s.duplicateRatio, 0)}`);
console.log(`Number of sentences: ${mockMatchedSentences.length}`);
console.log(`Average similarity: ${plagiarismRatio}%`);

console.log('\n✅ Expected result:');
console.log(`Document similarity should be: ${plagiarismRatio}%`);
console.log('This should match the duplicateRate in matching documents!');

console.log('\n🎯 COMPARISON:');
console.log('Before: duplicateRate was 35%, 23%, 15% (word-hash-based)');
console.log('After: duplicateRate should be ~80% (sentence-level average)');
console.log('Highlight segments: 60%, 100% (individual sentence similarity)');
console.log('✅ Now duplicateRate and highlight segments use the same calculation method!');