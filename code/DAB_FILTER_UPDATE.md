# Cập nhật ngưỡng lọc D A/B >= 50% và độ tương tự > 50%

## Thay đổi đã thực hiện

### Backend (DocumentAVLService.js)

Đã cập nhật method `checkDuplicateContent()` để áp dụng hai mức lọc chặt chẽ:

1. **Lọc token similarity > 50%**: Chỉ tính câu trùng khi độ tương tự token > 50% (thay vì >= 50%)
2. **Lọc sentence similarity > 50%**: Chỉ giữ câu có độ tương tự câu > 50% (thay vì >= 50%)
3. **Lọc document theo D A/B >= 50%**: Chỉ giữ lại những document có tỷ lệ trùng lặp D A/B >= 50%
4. **Tính Dtotal từ document đã lọc**: Dtotal chỉ được tính từ những document có D A/B >= 50%

### Chi tiết thay đổi:

```javascript
// Cũ: Lọc token similarity >= 50%
if (percent >= 50) {
  // ... tính câu trùng lặp
}

// Mới: Lọc token similarity > 50%
if (percent > 50) {
  // ... tính câu trùng lặp
}

// Cũ: Lọc sentence similarity >= 50%
const filteredDetails = enrichedDetails.filter(detail => detail.matchedSentenceSimilarity >= 50);

// Mới: Lọc sentence similarity > 50%
const filteredDetails = enrichedDetails.filter(detail => detail.matchedSentenceSimilarity > 50);

// Sửa công thức D A/B:
// Cũ: dabPercent = (matchedSentenceCount / totalSentencesInB) * 100
// Mới: dabPercent = (matchedSentenceCount / totalInputSentences) * 100
```

### Tác động:

1. **Độ chính xác cao hơn**: Ngưỡng > 50% thay vì >= 50% giúp loại bỏ những trường hợp biên
2. **D A/B chính xác**: Sửa công thức D A/B = (câu trùng từ A) / (tổng câu trong A) × 100%
3. **Dtotal tin cậy**: Chỉ tính từ những document thực sự có độ trùng lặp cao (>= 50%)
4. **Giảm nhiễu**: Loại bỏ những document và câu có độ trùng lặp thấp

### Các ngưỡng áp dụng:

1. **Token Similarity**: > 50% để tính câu trùng lặp
2. **Sentence Similarity**: > 50% để giữ lại câu trong kết quả cuối
3. **Document D A/B**: >= 50% để giữ lại document trong kết quả cuối
4. **Overall Similarity**: >= minSimilarity (configurable) để xét document

### Frontend

Đã cập nhật để sử dụng `dabPercent` từ backend thay vì tính toán riêng:
- DetailedComparison.jsx: Sử dụng `match.dabPercent` từ backend
- TextDetailedComparison.jsx: Sử dụng `matches[selectedIndex].dabPercent` từ backend

## Kết luận

Hệ thống bây giờ áp dụng ngưỡng lọc chặt chẽ hơn:
- Chỉ tập trung vào những document và câu có độ trùng lặp thực sự cao (> 50%)
- Tính Dtotal chính xác dựa trên những document đã lọc
- Cung cấp kết quả đáng tin cậy và ít nhiễu hơn cho người dùng