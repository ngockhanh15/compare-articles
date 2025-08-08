const vietnameseStopwordService = require("../services/VietnameseStopwordService");

async function testVntkIntegration() {
  console.log("🧪 Bắt đầu test tích hợp VNTK...\n");

  try {
    // Khởi tạo service
    await vietnameseStopwordService.initialize();
    console.log("✅ Service đã được khởi tạo thành công\n");

    // Test text tiếng Việt
    const testTexts = [
      "Tôi đang học lập trình JavaScript và Python.",
      "Hôm nay trời đẹp, tôi sẽ đi chơi với bạn bè.",
      "Việt Nam là một đất nước xinh đẹp với nhiều danh lam thắng cảnh.",
      "Công nghệ thông tin đang phát triển rất nhanh trong thời đại số.",
      "Trường đại học Bách khoa Hà Nội là một trong những trường hàng đầu về kỹ thuật."
    ];

    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      console.log(`📝 Test ${i + 1}: "${text}"`);
      
      // Test extractMeaningfulWords với vntk
      console.log("🔍 Tách từ có nghĩa với VNTK:");
      const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
      console.log(`   Kết quả (${meaningfulWords.length} từ): [${meaningfulWords.join(', ')}]`);
      
      // Test removeStopwords với vntk
      console.log("🧹 Loại bỏ stopwords với VNTK:");
      const filteredText = vietnameseStopwordService.removeStopwords(text);
      console.log(`   Kết quả: "${filteredText}"`);
      
      // Test calculateStopwordDensity với vntk
      console.log("📊 Tính mật độ stopwords với VNTK:");
      const density = vietnameseStopwordService.calculateStopwordDensity(text);
      console.log(`   Mật độ stopwords: ${density.toFixed(2)}%`);
      
      console.log("─".repeat(80));
    }

    // Test so sánh với phương pháp cũ (tách từ thủ công)
    console.log("\n🔄 So sánh với phương pháp tách từ thủ công:");
    const compareText = "Tôi đang học lập trình JavaScript và Python tại trường đại học.";
    
    // Phương pháp cũ (thủ công)
    const oldWords = compareText
      .toLowerCase()
      .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, " ")
      .split(/\s+/)
      .filter((word) => word.trim().length > 0)
      .filter((word) => !vietnameseStopwordService.isStopword(word));
    
    // Phương pháp mới (vntk)
    const newWords = vietnameseStopwordService.extractMeaningfulWords(compareText);
    
    console.log(`📝 Text: "${compareText}"`);
    console.log(`🔧 Phương pháp cũ (${oldWords.length} từ): [${oldWords.join(', ')}]`);
    console.log(`🆕 Phương pháp mới với VNTK (${newWords.length} từ): [${newWords.join(', ')}]`);
    
    // Tìm sự khác biệt
    const onlyInOld = oldWords.filter(word => !newWords.includes(word));
    const onlyInNew = newWords.filter(word => !oldWords.includes(word));
    
    if (onlyInOld.length > 0) {
      console.log(`❌ Chỉ có trong phương pháp cũ: [${onlyInOld.join(', ')}]`);
    }
    if (onlyInNew.length > 0) {
      console.log(`✅ Chỉ có trong phương pháp mới: [${onlyInNew.join(', ')}]`);
    }
    if (onlyInOld.length === 0 && onlyInNew.length === 0) {
      console.log("🎯 Kết quả giống nhau hoàn toàn!");
    }

    console.log("\n✅ Test tích hợp VNTK hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi trong quá trình test:", error);
  }
}

// Chạy test
testVntkIntegration();