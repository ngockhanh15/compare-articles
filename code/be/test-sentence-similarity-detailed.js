const dotenv = require("dotenv");
const VietnameseStopwordService = require('./services/VietnameseStopwordService');

// Load environment variables
dotenv.config();

/**
 * Test chi tiết độ tương đồng giữa 2 câu
 * Hiển thị:
 * - Từ cắt của từng câu
 * - Cặp từ trùng nhau
 * - Tỷ lệ tương đồng theo các phương pháp khác nhau
 * - Phân tích chi tiết
 */

class SentenceSimilarityTester {
  constructor() {
    this.vietnameseStopwordService = new VietnameseStopwordService();
  }

  async initialize() {
    await this.vietnameseStopwordService.initialize();
    console.log("✅ Vietnamese Stopword Service initialized\n");
  }

  /**
   * Tính độ tương đồng chi tiết giữa 2 câu
   */
  calculateDetailedSimilarity(sentence1, sentence2) {
    console.log("=" .repeat(80));
    console.log("🔍 PHÂN TÍCH ĐỘ TƯƠNG ĐỒNG CHI TIẾT");
    console.log("=" .repeat(80));
    
    console.log(`📝 Câu 1: "${sentence1}"`);
    console.log(`📝 Câu 2: "${sentence2}"`);
    console.log();

    // Tokenize cả hai câu
    const tokens1 = this.vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentence1);
    const tokens2 = this.vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentence2);

    console.log("🔤 PHÂN TÍCH TỪ CẮT:");
    console.log("-" .repeat(50));
    console.log(`Câu 1 - Từ cắt (${tokens1.length} từ):`, tokens1);
    console.log(`Câu 2 - Từ cắt (${tokens2.length} từ):`, tokens2);
    console.log();

    // Tìm từ trùng nhau
    const commonTokens = [];
    const matchedPairs = [];
    
    tokens1.forEach(token1 => {
      tokens2.forEach(token2 => {
        if (token1.toLowerCase() === token2.toLowerCase()) {
          if (!commonTokens.some(t => t.toLowerCase() === token1.toLowerCase())) {
            commonTokens.push(token1);
          }
          matchedPairs.push({ token1, token2, match: true });
        }
      });
    });

    console.log("🎯 PHÂN TÍCH CẶP TỪ TRÙNG:");
    console.log("-" .repeat(50));
    console.log(`Số từ trùng: ${commonTokens.length}`);
    console.log(`Từ trùng:`, commonTokens);
    console.log();

    if (matchedPairs.length > 0) {
      console.log("📋 Chi tiết cặp từ trùng:");
      matchedPairs.forEach((pair, index) => {
        console.log(`  ${index + 1}. "${pair.token1}" ↔ "${pair.token2}"`);
      });
      console.log();
    }

    // Tìm từ không trùng
    const uniqueTokens1 = tokens1.filter(token => 
      !commonTokens.some(common => common.toLowerCase() === token.toLowerCase())
    );
    const uniqueTokens2 = tokens2.filter(token => 
      !commonTokens.some(common => common.toLowerCase() === token.toLowerCase())
    );

    console.log("🔍 PHÂN TÍCH TỪ KHÔNG TRÙNG:");
    console.log("-" .repeat(50));
    console.log(`Câu 1 - Từ riêng (${uniqueTokens1.length}):`, uniqueTokens1);
    console.log(`Câu 2 - Từ riêng (${uniqueTokens2.length}):`, uniqueTokens2);
    console.log();

    // Tính các loại similarity
    const similarities = this.calculateMultipleSimilarities(tokens1, tokens2, commonTokens);

    console.log("📊 CÁC PHƯƠNG PHÁP TÍNH ĐỘ TƯƠNG ĐỒNG:");
    console.log("-" .repeat(50));
    
    Object.entries(similarities).forEach(([method, data]) => {
      console.log(`${data.icon} ${data.name}:`);
      console.log(`   Công thức: ${data.formula}`);
      console.log(`   Tính toán: ${data.calculation}`);
      console.log(`   Kết quả: ${data.percentage.toFixed(2)}%`);
      console.log(`   Đánh giá: ${this.getSimilarityLevel(data.percentage)}`);
      console.log();
    });

    // Phân tích ngưỡng
    console.log("⚖️  PHÂN TÍCH NGƯỠNG:");
    console.log("-" .repeat(50));
    const threshold = 50;
    const mainSimilarity = similarities.ratio.percentage;
    
    console.log(`Ngưỡng phát hiện: ${threshold}%`);
    console.log(`Độ tương đồng chính: ${mainSimilarity.toFixed(2)}%`);
    console.log(`Kết quả: ${mainSimilarity >= threshold ? '🚨 PHÁT HIỆN TƯƠNG ĐỒNG' : '✅ KHÔNG TƯƠNG ĐỒNG'}`);
    console.log();

    // Thống kê tổng quan
    console.log("📈 THỐNG KÊ TỔNG QUAN:");
    console.log("-" .repeat(50));
    console.log(`Tổng từ câu 1: ${tokens1.length}`);
    console.log(`Tổng từ câu 2: ${tokens2.length}`);
    console.log(`Từ trùng nhau: ${commonTokens.length}`);
    console.log(`Từ riêng câu 1: ${uniqueTokens1.length}`);
    console.log(`Từ riêng câu 2: ${uniqueTokens2.length}`);
    console.log(`Tổng từ duy nhất: ${new Set([...tokens1, ...tokens2]).size}`);
    console.log();

    return {
      sentence1,
      sentence2,
      tokens1,
      tokens2,
      commonTokens,
      uniqueTokens1,
      uniqueTokens2,
      matchedPairs,
      similarities,
      threshold,
      detected: mainSimilarity >= threshold
    };
  }

  /**
   * Tính nhiều loại similarity khác nhau
   */
  calculateMultipleSimilarities(tokens1, tokens2, commonTokens) {
    const len1 = tokens1.length;
    const len2 = tokens2.length;
    const common = commonTokens.length;
    const allTokens = new Set([...tokens1, ...tokens2]);
    const totalUnique = allTokens.size;

    return {
      ratio: {
        name: "Ratio Similarity (Dự án sử dụng)",
        icon: "🎯",
        formula: "từ_trùng / từ_câu_1",
        calculation: `${common} / ${len1}`,
        percentage: len1 > 0 ? (common / len1) * 100 : 0
      },
      jaccard: {
        name: "Jaccard Similarity",
        icon: "🔄",
        formula: "từ_trùng / tổng_từ_duy_nhất",
        calculation: `${common} / ${totalUnique}`,
        percentage: totalUnique > 0 ? (common / totalUnique) * 100 : 0
      },
      cosine: {
        name: "Cosine-like Similarity",
        icon: "📐",
        formula: "từ_trùng / sqrt(từ_câu_1 * từ_câu_2)",
        calculation: `${common} / sqrt(${len1} * ${len2})`,
        percentage: (len1 > 0 && len2 > 0) ? (common / Math.sqrt(len1 * len2)) * 100 : 0
      },
      dice: {
        name: "Dice Coefficient",
        icon: "🎲",
        formula: "2 * từ_trùng / (từ_câu_1 + từ_câu_2)",
        calculation: `2 * ${common} / (${len1} + ${len2})`,
        percentage: (len1 + len2) > 0 ? (2 * common / (len1 + len2)) * 100 : 0
      },
      overlap: {
        name: "Overlap Coefficient",
        icon: "🔗",
        formula: "từ_trùng / min(từ_câu_1, từ_câu_2)",
        calculation: `${common} / min(${len1}, ${len2})`,
        percentage: Math.min(len1, len2) > 0 ? (common / Math.min(len1, len2)) * 100 : 0
      }
    };
  }

  /**
   * Đánh giá mức độ tương đồng
   */
  getSimilarityLevel(percentage) {
    if (percentage >= 90) return "🔴 Rất cao (≥90%)";
    if (percentage >= 70) return "🟠 Cao (70-89%)";
    if (percentage >= 50) return "🟡 Trung bình (50-69%)";
    if (percentage >= 30) return "🟢 Thấp (30-49%)";
    return "⚪ Rất thấp (<30%)";
  }

  /**
   * Chạy test với nhiều cặp câu mẫu
   */
  async runTests() {
    const testCases = [
      {
        name: "Trùng hoàn toàn",
        sentence1: "tôi yêu em",
        sentence2: "tôi yêu em"
      },
      {
        name: "Tương đồng cao",
        sentence1: "tôi yêu em rất nhiều",
        sentence2: "tôi yêu em"
      },
      {
        name: "Tương đồng trung bình",
        sentence1: "tôi là khánh, tôi thích chơi thể thao",
        sentence2: "tôi là khánh, tôi ưa thích thể thao"
      },
      {
        name: "Tương đồng thấp",
        sentence1: "hôm nay trời đẹp",
        sentence2: "trời hôm nay rất đẹp"
      },
      {
        name: "Không tương đồng",
        sentence1: "tôi đi học",
        sentence2: "em ăn cơm"
      },
      {
        name: "Câu phức tạp",
        sentence1: "Việt Nam là một đất nước xinh đẹp với nhiều danh lam thắng cảnh",
        sentence2: "Đất nước Việt Nam rất xinh đẹp và có nhiều thắng cảnh nổi tiếng"
      }
    ];

    console.log("🧪 BẮT ĐẦU TEST ĐỘ TƯƠNG ĐỒNG CHI TIẾT");
    console.log("=" .repeat(80));
    console.log();

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`📋 TEST CASE ${i + 1}: ${testCase.name.toUpperCase()}`);
      
      const result = this.calculateDetailedSimilarity(testCase.sentence1, testCase.sentence2);
      results.push({ ...testCase, result });

      if (i < testCases.length - 1) {
        console.log("\n" + "⏭️  CHUYỂN SANG TEST CASE TIẾP THEO...\n");
        console.log("=" .repeat(80));
        console.log();
      }
    }

    // Tóm tắt kết quả
    console.log("\n" + "=" .repeat(80));
    console.log("📊 TÓM TẮT KẾT QUẢ TẤT CẢ TEST CASES");
    console.log("=" .repeat(80));
    
    results.forEach((test, index) => {
      const mainSimilarity = test.result.similarities.ratio.percentage;
      console.log(`${index + 1}. ${test.name}:`);
      console.log(`   Độ tương đồng: ${mainSimilarity.toFixed(2)}%`);
      console.log(`   Trạng thái: ${test.result.detected ? '🚨 PHÁT HIỆN' : '✅ AN TOÀN'}`);
      console.log(`   Từ trùng: ${test.result.commonTokens.length}/${test.result.tokens1.length}`);
      console.log();
    });

    console.log("🏁 HOÀN THÀNH TẤT CẢ TEST CASES!");
  }

  /**
   * Test với câu do người dùng nhập
   */
  async testCustomSentences(sentence1, sentence2) {
    console.log("🔧 TEST TÙY CHỈNH");
    return this.calculateDetailedSimilarity(sentence1, sentence2);
  }
}

// Chạy test
async function main() {
  const tester = new SentenceSimilarityTester();
  
  try {
    await tester.initialize();
    
    // Kiểm tra nếu có tham số dòng lệnh
    const args = process.argv.slice(2);
    
    if (args.length >= 2) {
      // Test với câu tùy chỉnh
      const sentence1 = "Ngoài những lợi ích to lớn, điện thoại thông minh cũng tiềm ẩn nhiều tác hại đối với con người.";
      const sentence2 = "Bên cạnh lợi ích, việc lạm dụng điện thoại có tác hại tới sức khỏe tinh thần và thể chất.";
      console.log("🎯 CHẠY TEST VỚI CÂU TÙY CHỈNH\n");
      await tester.testCustomSentences(sentence1, sentence2);
    } else {
      // Chạy tất cả test cases mẫu
      await tester.runTests();
      
      console.log("\n" + "💡 HƯỚNG DẪN SỬ DỤNG:");
      console.log("Để test với câu tùy chỉnh, chạy:");
      console.log('node test-sentence-similarity-detailed.js "câu thứ nhất" "câu thứ hai"');
    }
    
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    process.exit(0);
  }
}

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
  main();
}

module.exports = SentenceSimilarityTester;