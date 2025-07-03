// API base URL
const API_BASE_URL = 'http://localhost:3001/api';

// Hàm so sánh văn bản
export const compareTexts = async (text1, text2) => {
  try {
    const response = await fetch(`${API_BASE_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text1, text2 }),
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Compare texts error:', error);
    throw error;
  }
};

// Hàm lấy lịch sử so sánh
export const getHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/history`);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get history error:', error);
    throw error;
  }
};

// Hàm lọc từ khóa
export const filterWords = async (text, keywords) => {
  try {
    const response = await fetch(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, keywords }),
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Filter words error:', error);
    throw error;
  }
};