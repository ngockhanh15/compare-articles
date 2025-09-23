// Test script để kiểm tra bộ lọc theo thời gian
const { format } = require('date-fns');

// Hàm helper để format date cho input
const formatDateForInput = (date) => {
  return date.toISOString().split('T')[0];
};

// Test các trường hợp khác nhau
console.log('=== Test Date Filter Functions ===');

// Test hôm nay
const today = new Date();
console.log('Hôm nay:', formatDateForInput(today));

// Test 7 ngày qua
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(today.getDate() - 7);
console.log('7 ngày trước:', formatDateForInput(sevenDaysAgo));
console.log('Đến hôm nay:', formatDateForInput(today));

// Test 30 ngày qua
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);
console.log('30 ngày trước:', formatDateForInput(thirtyDaysAgo));
console.log('Đến hôm nay:', formatDateForInput(today));

// Test backend date filter logic
console.log('\n=== Test Backend Date Filter Logic ===');

const testDateFilter = (startDate, endDate) => {
  const dateFilter = {};
  
  if (startDate) {
    dateFilter.$gte = new Date(startDate);
  }
  
  if (endDate) {
    // Add one day to endDate to include the entire end date
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    dateFilter.$lt = endDateTime;
  }
  
  return dateFilter;
};

// Test với startDate và endDate
const filter1 = testDateFilter('2024-01-01', '2024-01-31');
console.log('Filter từ 2024-01-01 đến 2024-01-31:', filter1);

// Test chỉ với startDate
const filter2 = testDateFilter('2024-01-01', null);
console.log('Filter từ 2024-01-01:', filter2);

// Test chỉ với endDate
const filter3 = testDateFilter(null, '2024-01-31');
console.log('Filter đến 2024-01-31:', filter3);

console.log('\n=== Test Complete ===');