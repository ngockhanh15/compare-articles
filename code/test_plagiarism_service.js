const PlagiarismDetectionService = require('./be/services/PlagiarismDetectionService');

async function testPlagiarismService() {
  console.log('🧪 Testing PlagiarismDetectionService...');
  
  const service = new PlagiarismDetectionService();
  
  // Test text
  const testText = "Đây là một văn bản test để kiểm tra tính năng phát hiện trùng lặp. Văn bản này có nhiều từ có nghĩa và câu hoàn chỉnh.";
  
  try {
    console.log('\n📊 Step 1: Initialize service');
    await service.initialize();
    console.log('Service initialized successfully');
    console.log('Tree stats:');
    console.log('- Documents:', service.documentTree.getSize());
    console.log('- Words:', service.wordTree.getSize());
    console.log('- Sentences:', service.sentenceTree.getSize());
    
    console.log('\n📊 Step 2: Add test document to tree');
    const docId = service.addDocumentToTree(testText, { id: 'test-doc-1', source: 'test' });
    console.log('Document added with ID:', docId);
    console.log('Tree stats after adding:');
    console.log('- Documents:', service.documentTree.getSize());
    console.log('- Words:', service.wordTree.getSize());
    console.log('- Sentences:', service.sentenceTree.getSize());
    
    console.log('\n📊 Step 3: Check plagiarism with same text');
    const result = await service.checkPlagiarism(testText, { sensitivity: 'medium' });
    console.log('Plagiarism check result:');
    console.log('- duplicatePercentage:', result.duplicatePercentage);
    console.log('- confidence:', result.confidence);
    console.log('- matches count:', result.matches.length);
    console.log('- sources:', result.sources);
    
    if (result.matches.length > 0) {
      console.log('First match details:');
      console.log('- similarity:', result.matches[0].similarity);
      console.log('- method:', result.matches[0].method);
      console.log('- source:', result.matches[0].source);
    }
    
    console.log('\n📊 Step 4: Check plagiarism with different text');
    const differentText = "Hôm nay trời đẹp, tôi đi chơi công viên với bạn bè.";
    const result2 = await service.checkPlagiarism(differentText, { sensitivity: 'medium' });
    console.log('Different text result:');
    console.log('- duplicatePercentage:', result2.duplicatePercentage);
    console.log('- confidence:', result2.confidence);
    console.log('- matches count:', result2.matches.length);
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testPlagiarismService();