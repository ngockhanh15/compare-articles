const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function debugDatabaseComparison() {
  console.log('=== DEBUG DATABASE COMPARISON ISSUE ===\n');
  
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('📄 DOCUMENTS:');
  console.log('DOC1 (trong database):', doc1);
  console.log('DOC2 (user input):', doc2);
  console.log();
  
  // 1. Kiểm tra text processing
  console.log('🔍 1. KIỂM TRA TEXT PROCESSING:');
  
  // Meaningful words
  const words1 = vietnameseStopwordService.extractMeaningfulWords(doc1);
  const words2 = vietnameseStopwordService.extractMeaningfulWords(doc2);
  
  console.log('Meaningful words doc1:', words1);
  console.log('Meaningful words doc2:', words2);
  console.log();
  
  // Phrases
  const phrases1 = TextHasher.createMeaningfulPhrases(words1);
  const phrases2 = TextHasher.createMeaningfulPhrases(words2);
  
  console.log('Phrases doc1:', phrases1);
  console.log('Phrases doc2:', phrases2);
  console.log();
  
  // 2. Kiểm tra hashing
  console.log('🔍 2. KIỂM TRA HASHING:');
  
  const hashes1 = phrases1.map(phrase => TextHasher.createMD5Hash(phrase));
  const hashes2 = phrases2.map(phrase => TextHasher.createMD5Hash(phrase));
  
  console.log('Hashes doc1:', hashes1);
  console.log('Hashes doc2:', hashes2);
  console.log();
  
  // 3. Kiểm tra intersection
  console.log('🔍 3. KIỂM TRA INTERSECTION:');
  
  const set1 = new Set(hashes1);
  const set2 = new Set(hashes2);
  const intersection = [...set2].filter(hash => set1.has(hash));
  
  console.log('Hash intersection:', intersection);
  console.log('Intersection count:', intersection.length);
  console.log('Doc2 total hashes:', set2.size);
  console.log('Expected ratio:', (intersection.length / set2.size * 100).toFixed(2) + '%');
  console.log();
  
  // 4. Kiểm tra các vấn đề có thể xảy ra
  console.log('🔍 4. KIỂM TRA CÁC VẤN ĐỀ CÓ THỂ:');
  
  // Vấn đề 1: Text normalization
  console.log('a) Text normalization:');
  console.log('Doc1 length:', doc1.length);
  console.log('Doc2 length:', doc2.length);
  console.log('Doc1 trimmed:', doc1.trim());
  console.log('Doc2 trimmed:', doc2.trim());
  console.log();
  
  // Vấn đề 2: Stopwords filtering
  console.log('b) Stopwords filtering:');
  const allWords1 = doc1.toLowerCase().split(/\s+/);
  const allWords2 = doc2.toLowerCase().split(/\s+/);
  console.log('All words doc1:', allWords1);
  console.log('All words doc2:', allWords2);
  console.log('Filtered words doc1:', words1);
  console.log('Filtered words doc2:', words2);
  console.log();
  
  // Vấn đề 3: Phrase creation
  console.log('c) Phrase creation logic:');
  console.log('Words1 count:', words1.length);
  console.log('Words2 count:', words2.length);
  console.log('Expected phrases1 count:', Math.max(0, words1.length - 1));
  console.log('Expected phrases2 count:', Math.max(0, words2.length - 1));
  console.log('Actual phrases1 count:', phrases1.length);
  console.log('Actual phrases2 count:', phrases2.length);
  console.log();
  
  // 5. Mô phỏng quá trình trong PlagiarismDetectionService
  console.log('🔍 5. MÔ PHỎNG QUÁ TRÌNH TRONG SERVICE:');
  
  // Giả lập findPhraseMatches
  console.log('a) findPhraseMatches simulation:');
  const doc2Phrases = TextHasher.createPhraseHashes(doc2, true);
  console.log('Doc2 phrase hashes:', doc2Phrases.map(p => ({ phrase: p.phrase, hash: p.hash })));
  
  // Giả lập tìm kiếm trong tree
  console.log('b) Tree search simulation:');
  let foundMatches = 0;
  doc2Phrases.forEach(phraseData => {
    // Giả lập tìm thấy match với doc1
    const isMatch = phrases1.includes(phraseData.phrase);
    if (isMatch) {
      foundMatches++;
      console.log(`  Found match: ${phraseData.phrase}`);
    }
  });
  
  console.log(`Total matches found: ${foundMatches}`);
  console.log(`Total phrases to check: ${doc2Phrases.length}`);
  console.log(`Simulated ratio: ${(foundMatches / doc2Phrases.length * 100).toFixed(2)}%`);
  console.log();
  
  // 6. Kết luận
  console.log('📋 6. KẾT LUẬN:');
  console.log('Nếu hệ thống báo 0%, có thể do:');
  console.log('1. ❌ Doc1 trong database có format khác (extra spaces, encoding, etc.)');
  console.log('2. ❌ Stopwords service không hoạt động đúng');
  console.log('3. ❌ Hash function không consistent');
  console.log('4. ❌ Tree search không tìm thấy matches');
  console.log('5. ❌ Threshold logic bị sai');
  console.log();
  console.log('Expected result với doc1 và doc2:');
  console.log(`✅ Ratio: ${(intersection.length / set2.size * 100).toFixed(2)}%`);
  console.log(`✅ Status: ${intersection.length / set2.size * 100 > 50 ? 'TRÙNG LẶP' : 'KHÔNG TRÙNG LẶP'}`);
}

debugDatabaseComparison().catch(console.error);