const { TextHasher } = require('../utils/TreeAVL');
const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function createNewAVLVector() {
  try {
    console.log('=== KHỞI TẠO ===');
    await vietnameseStopwordService.initialize();
    
    console.log('\n=== TẠO AVL VECTOR MỚI ===');
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Text gốc: ${testText}`);
    
    // Sử dụng method mới với phrase protection
    const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(testText);
    console.log(`\nTokens với phrase protection: [${tokens.join(', ')}]`);
    
    // Tạo hash vector mới
    const hashVector = tokens.map((word, index) => ({
      hash: TextHasher.createMurmurHash(word),
      word: word,
      index: index,
      method: "murmur32"
    }));
    
    console.log('\n=== HASH VECTOR MỚI ===');
    hashVector.forEach((item, index) => {
      console.log(`  ${index}: "${item.word}" -> ${item.hash}`);
    });
    
    console.log('\n=== SO SÁNH VỚI HASH VECTOR CŨ ===');
    console.log('Hash vector cũ từ document:');
    const oldHashVector = [
      { hash: "63f6708f", word: "khánh", index: 0, method: "murmur32" },
      { hash: "5387064d", word: "ưa", index: 1, method: "murmur32" },
      { hash: "c85c0a3e", word: "thể", index: 2, method: "murmur32" },
      { hash: "8ef1713d", word: "thao", index: 3, method: "murmur32" },
      { hash: "6b141422", word: "đặc", index: 4, method: "murmur32" },
      { hash: "a6711183", word: "biệt", index: 5, method: "murmur32" },
      { hash: "bb3f2d4d", word: "đá", index: 6, method: "murmur32" },
      { hash: "2fc2cde5", word: "bóng", index: 7, method: "murmur32" }
    ];
    
    oldHashVector.forEach((item, index) => {
      console.log(`  ${index}: "${item.word}" -> ${item.hash}`);
    });
    
    console.log('\n=== PHÂN TÍCH ===');
    console.log(`Số từ cũ: ${oldHashVector.length}`);
    console.log(`Số từ mới: ${hashVector.length}`);
    
    const phraseProtected = hashVector.filter(item => item.word.includes(' '));
    console.log(`Cụm từ được bảo vệ: [${phraseProtected.map(p => p.word).join(', ')}]`);
    
    // Tạo AVL tree data structure mới
    const newAVLTreeData = {
      sortKey: "02-1754988501472-fe4247a6", // Giữ nguyên sortKey cũ
      hashVector: hashVector,
      treeMetadata: {
        documentId: "689affd57944f766fe4247a6",
        insertedAt: new Date(),
        textLength: testText.length,
        wordCount: hashVector.length,
        fileTypeWeight: 2,
        usedPhraseProtection: true // Flag để biết dùng phrase protection
      }
    };
    
    console.log('\n=== AVL TREE DATA MỚI ===');
    console.log(JSON.stringify(newAVLTreeData, null, 2));
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

createNewAVLVector();
