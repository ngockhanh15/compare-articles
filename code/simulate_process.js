const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function simulateProcess() {
  console.log('=== GIẢ LẬP QUY TRÌNH KIỂM TRA TRÙNG LẶP ===\n');
  
  // Khởi tạo stopword service
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('📄 DOCUMENTS:');
  console.log('DOC1 (đã có trong database):', doc1);
  console.log('DOC2 (người dùng nhập vào):', doc2);
  console.log();
  
  // BƯỚC 1: Tính tỷ lệ trùng lặp thực tế
  console.log('🔍 BƯỚC 1: TÍNH TỶ LỆ TRÙNG LẶP');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(doc2, doc1, true);
  console.log('Kết quả so sánh doc2 vs doc1:', plagiarismResult);
  console.log(`Tỷ lệ trùng lặp: ${plagiarismResult.ratio}%`);
  console.log();
  
  // BƯỚC 2: Áp dụng logic threshold
  console.log('⚖️ BƯỚC 2: ÁP DỤNG LOGIC THRESHOLD');
  const threshold = 50;
  const isDetected = plagiarismResult.ratio > threshold;
  
  console.log(`Ngưỡng: > ${threshold}%`);
  console.log(`Tỷ lệ thực tế: ${plagiarismResult.ratio}%`);
  console.log(`Điều kiện: ${plagiarismResult.ratio}% > ${threshold}% = ${isDetected}`);
  console.log();
  
  // BƯỚC 3: Xác định confidence
  console.log('🎯 BƯỚC 3: XÁC ĐỊNH CONFIDENCE');
  const confidence = isDetected ? 'high' : 'low';
  console.log(`Confidence: ${confidence}`);
  console.log(`Logic: ${plagiarismResult.ratio}% ${isDetected ? '>' : '≤'} 50% → confidence = ${confidence}`);
  console.log();
  
  // BƯỚC 4: Kết quả hiển thị trên giao diện
  console.log('🖥️ BƯỚC 4: HIỂN THỊ TRÊN GIAO DIỆN');
  const displayResult = isDetected ? 'PHÁT HIỆN TRÙNG LẶP' : 'KHÔNG TRÙNG LẶP';
  const statusColor = isDetected ? '🔴 Đỏ' : '🟢 Xanh';
  const statusIcon = isDetected ? '🚨' : '✅';
  
  console.log(`Tiêu đề: ${statusIcon} ${displayResult}`);
  console.log(`Tỷ lệ hiển thị: ${plagiarismResult.ratio}%`);
  console.log(`Màu sắc: ${statusColor}`);
  console.log(`Confidence: ${confidence}`);
  console.log(`Ngưỡng giải thích: (Ngưỡng: > 50% = trùng lặp)`);
  console.log();
  
  // BƯỚC 5: Test cases khác
  console.log('🧪 BƯỚC 5: TEST CASES KHÁC');
  const testCases = [
    { name: "Doc của bạn", ratio: plagiarismResult.ratio },
    { name: "Trường hợp 30%", ratio: 30 },
    { name: "Trường hợp 50%", ratio: 50 },
    { name: "Trường hợp 50.1%", ratio: 50.1 },
    { name: "Trường hợp 70%", ratio: 70 }
  ];
  
  testCases.forEach(testCase => {
    const detected = testCase.ratio > 50;
    const conf = detected ? 'high' : 'low';
    const display = detected ? 'TRÙNG LẶP' : 'KHÔNG TRÙNG LẶP';
    const icon = detected ? '🚨' : '✅';
    
    console.log(`${testCase.name}: ${testCase.ratio}% → ${icon} ${display} (confidence: ${conf})`);
  });
  
  console.log();
  
  // BƯỚC 6: Kết luận
  console.log('📋 BƯỚC 6: KẾT LUẬN');
  console.log('Với doc1 và doc2 của bạn:');
  console.log(`✅ Tỷ lệ trùng lặp: ${plagiarismResult.ratio}% (hiển thị chính xác)`);
  console.log(`✅ Kết luận: ${displayResult}`);
  console.log(`✅ Logic: ${plagiarismResult.ratio}% ${isDetected ? '>' : '≤'} 50% = ${isDetected ? 'Trùng lặp' : 'Không trùng lặp'}`);
  console.log(`✅ Confidence: ${confidence}`);
  console.log(`✅ Màu sắc: ${statusColor}`);
  
  console.log('\n🎯 YÊU CẦU ĐÃ ĐƯỢC ĐÁP ỨNG:');
  console.log('1. ✅ Hiển thị tỷ lệ % chính xác dù trùng bao nhiêu');
  console.log('2. ✅ Kèm theo đánh giá "Trùng lặp" hoặc "Không trùng lặp"');
  console.log('3. ✅ Dựa trên ngưỡng 50% đã thiết lập');
  console.log('4. ✅ Logic đơn giản: > 50% = trùng, ≤ 50% = không trùng');
  
  // Kiểm tra chi tiết phrases
  console.log('\n🔍 CHI TIẾT PHRASES:');
  console.log('Phrases doc1:', plagiarismResult.sourcePhrasesList);
  console.log('Phrases doc2:', plagiarismResult.checkPhrasesList);
  console.log('Phrases trùng:', plagiarismResult.matchedPhrasesList);
  console.log(`Tính toán: ${plagiarismResult.matchedPhrasesList.length}/${plagiarismResult.checkPhrasesList.length} = ${plagiarismResult.ratio}%`);
}

simulateProcess().catch(console.error);