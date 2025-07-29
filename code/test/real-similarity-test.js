/**
 * Test thực tế với Vietnamese Stopword Service để phân tích tại sao 83%
 */

const vietnameseStopwordService = require("../be/services/VietnameseStopwordService");

class RealSimilarityAnalyzer {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      console.log("🔧 Khởi tạo Vietnamese Stopword Service...");
      await vietnameseStopwordService.initialize();
      this.initialized = true;
      console.log("✅ Khởi tạo hoàn tất!");
    }
  }

  // Tạo cụm từ có nghĩa từ danh sách từ (copy từ TreeAVL.js)
  createMeaningfulPhrases(meaningfulWords, maxPhraseLength = 2) {
    const allPhrases = new Set();
    const usedWordIndices = new Set();

    // Ưu tiên tạo cụm từ 2-gram trước
    for (let i = 0; i <= meaningfulWords.length - 2; i++) {
      if (!usedWordIndices.has(i) && !usedWordIndices.has(i + 1)) {
        const phrase = meaningfulWords.slice(i, i + 2).join(" ");
        allPhrases.add(phrase);
        usedWordIndices.add(i);
        usedWordIndices.add(i + 1);
      }
    }

    // Thêm các từ đơn lẻ chưa được sử dụng
    meaningfulWords.forEach((word, index) => {
      if (!usedWordIndices.has(index)) {
        allPhrases.add(word);
      }
    });

    return Array.from(allPhrases);
  }

  // Tính độ tương đồng chính xác như trong code gốc
  async calculateRealSimilarity(inputSentence, docSentence) {
    await this.initialize();

    console.log("🔍 PHÂN TÍCH THỰC TẾ VỚI VIETNAMESE STOPWORD SERVICE");
    console.log("=".repeat(70));

    console.log("📝 Câu gốc:");
    console.log("Input:", inputSentence);
    console.log("Doc:  ", docSentence);

    // Sử dụng extractMeaningfulWords thực tế
    const inputWords =
      vietnameseStopwordService.extractMeaningfulWords(inputSentence);
    const docWords =
      vietnameseStopwordService.extractMeaningfulWords(docSentence);

    // Nhóm thành n-gram

    if (inputWords.length === 0 || docWords.length === 0) return 0;

    // Tạo cụm từ từ các từ có nghĩa
    let phrases1 = this.createMeaningfulPhrases(inputWords);
    let phrases2 = this.createMeaningfulPhrases(docWords);

    phrases1 = vietnameseStopwordService.extractMeaningfulWords(phrases1);
    phrases2 = vietnameseStopwordService.extractMeaningfulWords(phrases2);

    phrases1 = phrases1.flatMap((p) => p.split(/\s+/));
    phrases2 = phrases2.flatMap((p) => p.split(/\s+/));

    console.log("\n📊 Từ có nghĩa sau khi lọc stopwords (THỰC TẾ):");
    console.log("Input words:", phrases1);
    console.log("Doc words:  ", phrases2);

    // Tìm từ chung (giống logic trong findDuplicateSentences)
    const commonWords = phrases1.filter((word) => phrases2.includes(word));

    console.log("\n🔗 Từ chung:");
    console.log("Common words:", commonWords);

    // Tính độ tương đồng theo công thức chính xác
    const similarity =
      phrases1.length > 0
        ? (commonWords.length / phrases1.length) * 100
        : 0;

    console.log("\n📈 TÍNH TOÁN ĐỘ TƯƠNG ĐỒNG:");
    console.log("Công thức: (Số từ chung / Số từ input) × 100");
    console.log(
      `Tính toán: (${commonWords.length} / ${phrases1.length}) × 100`
    );
    console.log(`Kết quả:   ${similarity.toFixed(2)}%`);
    console.log(`Làm tròn:  ${Math.round(similarity)}%`);

    return {
      inputSentence,
      docSentence,
      inputWords,
      docWords,
      commonWords,
      similarity: Math.round(similarity),
      exactSimilarity: similarity,
      isDuplicate: similarity >= 50,
    };
  }

  // Test với nhiều cách viết khác nhau
  async testVariations() {
    await this.initialize();

    console.log("\n🔄 TEST VỚI CÁC BIẾN THỂ KHÁC NHAU");
    console.log("=".repeat(70));

    const variations = [
      {
        name: "Gốc",
        input: "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt",
        doc: "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng",
      },
      {
        name: "Đảo thứ tự",
        input: "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng",
        doc: "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt",
      },
      {
        name: "Bỏ dấu câu",
        input: "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt",
        doc: "Tôi là Khánh tôi ưa thích thể thao đặc biệt là đá bóng",
      },
    ];

    for (const variation of variations) {
      console.log(`\n--- ${variation.name} ---`);
      const result = await this.calculateRealSimilarity(
        variation.input,
        variation.doc
      );
      console.log(`Kết quả: ${result.similarity}%`);
    }
  }
}

// Chạy test
async function analyzeRealSimilarity() {
  const analyzer = new RealSimilarityAnalyzer();

  try {
    // Test chính
    const docSentence =
      "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng";
    const inputSentence =
      "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt";

    await analyzer.calculateRealSimilarity(inputSentence, docSentence);

    // Test các biến thể
    await analyzer.testVariations();
  } catch (error) {
    console.error("❌ Lỗi khi chạy test:", error);
  }
}

// Export
module.exports = {
  RealSimilarityAnalyzer,
  analyzeRealSimilarity,
};

// Chạy nếu gọi trực tiếp
if (require.main === module) {
  analyzeRealSimilarity();
}
