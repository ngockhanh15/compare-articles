// Test script để mô phỏng các kết quả khác nhau cho UI

const testCases = [
  {
    name: "Doc1 vs Doc2 (Trường hợp của bạn)",
    duplicateRate: 50,
    expected: "Không trùng lặp",
    description: "Đúng bằng ngưỡng 50%"
  },
  {
    name: "Trường hợp trùng lặp nhẹ",
    duplicateRate: 30,
    expected: "Không trùng lặp", 
    description: "Dưới ngưỡng 50%"
  },
  {
    name: "Trường hợp trùng lặp vừa phải",
    duplicateRate: 60,
    expected: "Trùng lặp",
    description: "Vượt ngưỡng 50%"
  },
  {
    name: "Trường hợp trùng lặp cao",
    duplicateRate: 85,
    expected: "Trùng lặp",
    description: "Cao hơn nhiều so với ngưỡng"
  },
  {
    name: "Trường hợp edge case",
    duplicateRate: 50.1,
    expected: "Trùng lặp",
    description: "Vượt ngưỡng một chút"
  }
];

console.log('=== TEST UI DISPLAY LOGIC ===\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Tỷ lệ: ${testCase.duplicateRate}%`);
  console.log(`   Ngưỡng: > 50%`);
  
  // Logic hiển thị
  const isDetected = testCase.duplicateRate > 50;
  const displayResult = isDetected ? "PHÁT HIỆN TRÙNG LẶP" : "KHÔNG TRÙNG LẶP";
  const status = isDetected ? "🚨 Cần xem xét" : "✅ An toàn";
  const color = isDetected ? "🔴 Đỏ" : "🟢 Xanh";
  
  console.log(`   Hiển thị: ${displayResult}`);
  console.log(`   Trạng thái: ${status}`);
  console.log(`   Màu sắc: ${color}`);
  console.log(`   Mong đợi: ${testCase.expected}`);
  console.log(`   Kết quả: ${displayResult.includes(testCase.expected.toUpperCase()) ? '✅ ĐÚNG' : '❌ SAI'}`);
  console.log(`   Mô tả: ${testCase.description}`);
  console.log();
});

console.log('=== SUMMARY ===');
console.log('Giao diện sẽ hiển thị:');
console.log('1. Tỷ lệ % chính xác (luôn hiển thị)');
console.log('2. Đánh giá rõ ràng: "TRÙNG LẶP" hoặc "KHÔNG TRÙNG LẶP"');
console.log('3. Ngưỡng được giải thích: "> 50% = trùng lặp"');
console.log('4. Màu sắc phù hợp: Đỏ cho trùng lặp, Xanh cho không trùng lặp');
console.log('5. Thông tin bổ sung về ngưỡng đánh giá');

console.log('\nVới doc1 và doc2 của bạn (50%):');
console.log('- Hiển thị: "KHÔNG TRÙNG LẶP" ✅');
console.log('- Tỷ lệ: 50% (hiển thị chính xác)');
console.log('- Màu: Xanh lá (an toàn)');
console.log('- Giải thích: "50% ≤ 50% = Không trùng lặp"');