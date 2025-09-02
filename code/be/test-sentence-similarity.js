const VietnameseStopwordService = require('./services/VietnameseStopwordService');

// Test câu của user
const inputSentence = "tôi là khánh, tôi thích chơi thể thao, đặc biệt là đá bóng và đá banh.";
const sourceSentence = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";

console.log("=== Test Sentence Similarity ===");
console.log("Input sentence:", inputSentence);
console.log("Source sentence:", sourceSentence);
console.log();

// Khởi tạo service
const vietnameseStopwordService = new VietnameseStopwordService();

// Tokenize cả hai câu
const inputTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(inputSentence);
const sourceTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sourceSentence);

console.log("Input tokens:", inputTokens);
console.log("Source tokens:", sourceTokens);
console.log();

// Tìm tokens chung
const commonTokens = inputTokens.filter(token =>
  sourceTokens.some(srcToken => srcToken.toLowerCase() === token.toLowerCase())
);

console.log("Common tokens:", commonTokens);
console.log("Common tokens count:", commonTokens.length);
console.log("Input tokens count:", inputTokens.length);
console.log("Source tokens count:", sourceTokens.length);
console.log();

// Tính similarity theo công thức hiện tại
const similarity = sourceTokens.length > 0 ? (commonTokens.length / Math.max(inputTokens.length, sourceTokens.length)) * 100 : 0;

console.log("=== Similarity Calculation ===");
console.log(`Similarity = (${commonTokens.length} / max(${inputTokens.length}, ${sourceTokens.length})) * 100`);
console.log(`Similarity = (${commonTokens.length} / ${Math.max(inputTokens.length, sourceTokens.length)}) * 100`);
console.log(`Similarity = ${similarity.toFixed(2)}%`);
console.log();

// Kiểm tra ngưỡng
console.log("=== Threshold Check ===");
console.log(`Similarity ${similarity}% > 50%? ${similarity > 50 ? "✅ PASS" : "❌ FAIL"}`);

// Tính similarity theo cách khác (Jaccard similarity)
const allTokens = new Set([...inputTokens, ...sourceTokens]);
const jaccardSimilarity = (commonTokens.length / allTokens.size) * 100;
console.log(`Jaccard similarity: ${jaccardSimilarity.toFixed(2)}%`);

// Tính similarity theo cách user mong muốn (3/4)
const userExpectedSimilarity = (commonTokens.length / inputTokens.length) * 100;
console.log(`User expected (common/input): ${userExpectedSimilarity.toFixed(2)}%`);
