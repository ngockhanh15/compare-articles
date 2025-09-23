// Utility functions for creating Excel template for bulk upload

export const createExcelTemplate = () => {
  // Create CSV content for Excel template
  const headers = ['Tên file', 'Tiêu đề', 'Tác giả', 'Mô tả'];
  const sampleData = [
    ['document1.pdf', 'Báo cáo tài chính Q1', 'Nguyễn Văn A', 'Báo cáo tài chính quý 1 năm 2024'],
    ['presentation.pptx', 'Thuyết trình dự án', 'Trần Thị B', 'Thuyết trình về dự án phát triển sản phẩm mới'],
    ['data.xlsx', 'Dữ liệu khảo sát', 'Lê Văn C', 'Kết quả khảo sát khách hàng tháng 3']
  ];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Add BOM for UTF-8 encoding to display Vietnamese characters correctly in Excel
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  return csvWithBOM;
};

export const downloadExcelTemplate = () => {
  const csvContent = createExcelTemplate();
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'metadata.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const validateExcelData = (data) => {
  const errors = [];
  const requiredColumns = ['Tên file', 'Tiêu đề', 'Tác giả'];
  
  if (!data || data.length === 0) {
    errors.push('File Excel không có dữ liệu');
    return { isValid: false, errors };
  }

  // Check if required columns exist
  const headers = data[0];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    errors.push(`Thiếu các cột bắt buộc: ${missingColumns.join(', ')}`);
  }

  // Check data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    
    // Check if filename is provided
    if (!row[0] || row[0].trim() === '') {
      errors.push(`Dòng ${rowNumber}: Thiếu tên file`);
    }
    
    // Check if title is provided
    if (!row[1] || row[1].trim() === '') {
      errors.push(`Dòng ${rowNumber}: Thiếu tiêu đề`);
    }
    
    // Check if author is provided
    if (!row[2] || row[2].trim() === '') {
      errors.push(`Dòng ${rowNumber}: Thiếu tác giả`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};