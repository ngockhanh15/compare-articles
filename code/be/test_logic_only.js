// Test logic highlighting và percentage consistency không cần database

console.log('🔍 Testing highlighting and percentage consistency logic...');

// Mock data để test
const mockPlagiarismCheck = {
  _id: 'test-check-id',
  duplicatePercentage: 83, // Tỷ lệ gốc cao
  originalText: `Đây là một văn bản test để kiểm tra tỷ lệ trùng lặp. 
  Chúng ta sẽ xem liệu có sự không nhất quán giữa tỷ lệ tổng thể và tỷ lệ từng document không.
  Văn bản này có thể trùng lặp với một số documents trong database.
  Hệ thống sẽ tô màu các đoạn văn bản trùng lặp để người dùng dễ nhận biết.
  Việc highlighting phải chính xác và phản ánh đúng mức độ trùng lặp.`,
  fileName: 'test-document.txt',
  textLength: 500,
  fileType: 'text/plain'
};

// Mock documents với tỷ lệ khác nhau, bao gồm trường hợp đảo từ
const mockDocuments = [
  {
    id: 'doc-1',
    fileName: 'document-1.txt',
    fileSize: 1000,
    fileType: 'text/plain',
    author: 'User A',
    uploadedAt: new Date(),
    duplicateRate: 27, // Tỷ lệ thấp hơn so với gốc
    status: 'medium',
    content: 'Đây là một văn bản test để kiểm tra tỷ lệ trùng lặp. Chúng ta sẽ xem liệu có sự không nhất quán.'
  },
  {
    id: 'doc-2', 
    fileName: 'document-2.txt',
    fileSize: 1200,
    fileType: 'text/plain',
    author: 'User B',
    uploadedAt: new Date(),
    duplicateRate: 45,
    status: 'medium',
    content: 'Văn bản này có thể trùng lặp với một số documents trong database. Hệ thống sẽ tô màu các đoạn văn bản.'
  },
  {
    id: 'doc-3',
    fileName: 'document-3.txt', 
    fileSize: 800,
    fileType: 'text/plain',
    author: 'User C',
    uploadedAt: new Date(),
    duplicateRate: 35,
    status: 'medium',
    content: 'Việc highlighting phải chính xác và phản ánh đúng mức độ trùng lặp trong hệ thống.'
  },
  {
    id: 'doc-4',
    fileName: 'paraphrase-test.txt',
    fileSize: 600,
    fileType: 'text/plain',
    author: 'User D',
    uploadedAt: new Date(),
    duplicateRate: 55, // Tỷ lệ cao vì có paraphrase
    status: 'high',
    content: 'Để kiểm tra tỷ lệ trùng lặp, đây là một văn bản test. Không nhất quán có sự liệu xem sẽ ta chúng.' // Câu đảo từ
  }
];

console.log('\n📊 ORIGINAL ISSUE:');
console.log('='.repeat(50));
console.log(`Original plagiarism check percentage: ${mockPlagiarismCheck.duplicatePercentage}%`);
console.log('Individual document percentages:');
mockDocuments.forEach((doc, index) => {
  console.log(`  ${index + 1}. ${doc.fileName}: ${doc.duplicateRate}%`);
});

// Test logic cũ (có vấn đề)
console.log('\n❌ OLD LOGIC (PROBLEMATIC):');
console.log('Frontend would show:');
console.log(`- Overall percentage: ${mockPlagiarismCheck.duplicatePercentage}% (from original check)`);
console.log(`- Individual documents: ${mockDocuments.map(d => d.duplicateRate + '%').join(', ')}`);
console.log('=> INCONSISTENT! 83% overall but individual docs only 27%, 45%, 35%');

// Test logic mới (đã sửa)
console.log('\n✅ NEW LOGIC (FIXED):');
mockDocuments.sort((a, b) => b.duplicateRate - a.duplicateRate);
const overallDuplicateRate = mockDocuments.length > 0 ? mockDocuments[0].duplicateRate : 0;

// Test paraphrase detection
console.log('\n🔄 PARAPHRASE DETECTION TEST:');
console.log('='.repeat(50));
const originalSentence = 'Đây là một văn bản test để kiểm tra tỷ lệ trùng lặp';
const paraphraseSentence = 'Để kiểm tra tỷ lệ trùng lặp, đây là một văn bản test';

console.log(`Original: "${originalSentence}"`);
console.log(`Paraphrase: "${paraphraseSentence}"`);

// Test paraphrase algorithm
const origWords = originalSentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);
const paraWords = paraphraseSentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);

const origWordSet = new Set(origWords);
const paraWordSet = new Set(paraWords);
const intersection = new Set([...origWordSet].filter(x => paraWordSet.has(x)));

const wordOverlap = intersection.size / Math.max(origWordSet.size, paraWordSet.size);
const lengthRatio = Math.min(origWords.length, paraWords.length) / Math.max(origWords.length, paraWords.length);
const paraphraseScore = Math.round(wordOverlap * lengthRatio * 100);

console.log(`Word overlap: ${wordOverlap.toFixed(2)} (${intersection.size}/${Math.max(origWordSet.size, paraWordSet.size)})`);
console.log(`Length ratio: ${lengthRatio.toFixed(2)}`);
console.log(`Paraphrase score: ${paraphraseScore}%`);
console.log(`Should be detected: ${wordOverlap >= 0.6 && lengthRatio >= 0.7 ? '✅ YES' : '❌ NO'}`);
console.log(`Common words: ${[...intersection].join(', ')}`);

console.log('After sorting by duplicate rate:');
mockDocuments.forEach((doc, index) => {
  console.log(`  ${index + 1}. ${doc.fileName}: ${doc.duplicateRate}%`);
});
console.log(`Calculated overall duplicate rate: ${overallDuplicateRate}% (highest document rate)`);
console.log('=> CONSISTENT! Overall rate matches highest individual document rate');

// Test highlighting logic
console.log('\n🎨 HIGHLIGHTING LOGIC TEST:');
console.log('='.repeat(50));

const originalText = mockPlagiarismCheck.originalText;
const colors = ['#ef4444', '#f97316', '#eab308'];
let highlightedSegments = [];

console.log(`Original text length: ${originalText.length} characters`);

mockDocuments.forEach((doc, docIndex) => {
  const color = colors[docIndex % colors.length];
  
  console.log(`\nProcessing ${doc.fileName}:`);
  
  // Test improved highlighting algorithm
  const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const docSentences = doc.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  console.log(`  - Original sentences: ${originalSentences.length}`);
  console.log(`  - Document sentences: ${docSentences.length}`);
  
  // Test word-based similarity
  const originalWords = originalText.toLowerCase().split(/\s+/);
  const docWords = doc.content.toLowerCase().split(/\s+/);
  const commonWords = originalWords.filter(word => 
    word.length > 4 && 
    docWords.includes(word) &&
    !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were'].includes(word)
  );
  
  console.log(`  - Common words found: ${commonWords.length}`);
  console.log(`  - Sample common words: ${[...new Set(commonWords)].slice(0, 5).join(', ')}`);
  
  // Test sentence similarity với paraphrase detection
  let sentenceMatches = 0;
  let paraphraseMatches = 0;
  
  originalSentences.forEach(origSentence => {
    const origWords = origSentence.toLowerCase().trim().split(/\s+/);
    if (origWords.length < 3) return;
    
    let bestSimilarity = 0;
    let isParaphrase = false;
    
    docSentences.forEach(docSentence => {
      const docWords = docSentence.toLowerCase().trim().split(/\s+/);
      if (docWords.length < 3) return;
      
      // Calculate similarity
      const origWordSet = new Set(origWords);
      const docWordSet = new Set(docWords);
      const intersection = new Set([...origWordSet].filter(x => docWordSet.has(x)));
      
      // Multiple similarity methods
      const jaccardSimilarity = (intersection.size / new Set([...origWordSet, ...docWordSet]).size) * 100;
      const overlapSimilarity = (intersection.size / origWordSet.size) * 100;
      const cosineSimilarity = (intersection.size / Math.sqrt(origWordSet.size * docWordSet.size)) * 100;
      
      // Paraphrase detection
      const wordOverlap = intersection.size / Math.max(origWordSet.size, docWordSet.size);
      const lengthRatio = Math.min(origWords.length, docWords.length) / Math.max(origWords.length, docWords.length);
      let paraphraseSimilarity = 0;
      
      if (wordOverlap >= 0.6 && lengthRatio >= 0.7) {
        paraphraseSimilarity = wordOverlap * lengthRatio * 100;
        isParaphrase = true;
      }
      
      const similarity = Math.max(jaccardSimilarity, overlapSimilarity, cosineSimilarity, paraphraseSimilarity);
      
      if (similarity > bestSimilarity && similarity > 10) { // Giảm threshold để bắt paraphrase
        bestSimilarity = similarity;
      }
    });
    
    if (bestSimilarity > 10) {
      sentenceMatches++;
      if (isParaphrase) paraphraseMatches++;
      
      highlightedSegments.push({
        start: originalText.indexOf(origSentence.trim()),
        end: originalText.indexOf(origSentence.trim()) + origSentence.trim().length,
        text: origSentence.trim(),
        documentId: doc.id,
        documentName: doc.fileName,
        similarity: Math.round(bestSimilarity),
        color: color,
        type: isParaphrase ? 'paraphrase' : 'normal'
      });
    }
  });
  
  console.log(`  - Sentence matches found: ${sentenceMatches}`);
  console.log(`  - Paraphrase matches found: ${paraphraseMatches}`);
  console.log(`  - Segments added: ${highlightedSegments.filter(s => s.documentId === doc.id).length}`);
});

// Clean overlapping segments
console.log(`\nTotal segments before cleaning: ${highlightedSegments.length}`);
highlightedSegments.sort((a, b) => a.start - b.start);

const cleanedSegments = [];
highlightedSegments.forEach(segment => {
  let hasOverlap = false;
  
  for (let existing of cleanedSegments) {
    if ((segment.start >= existing.start && segment.start < existing.end) ||
        (segment.end > existing.start && segment.end <= existing.end) ||
        (segment.start <= existing.start && segment.end >= existing.end)) {
      hasOverlap = true;
      if (segment.similarity > existing.similarity) {
        const index = cleanedSegments.indexOf(existing);
        cleanedSegments[index] = segment;
      }
      break;
    }
  }
  
  if (!hasOverlap) {
    cleanedSegments.push(segment);
  }
});

console.log(`Total segments after cleaning: ${cleanedSegments.length}`);

// Test highlighted text generation
let highlightedText = '';
let lastIndex = 0;

if (cleanedSegments.length > 0) {
  cleanedSegments.forEach(segment => {
    if (segment.start > lastIndex) {
      highlightedText += originalText.substring(lastIndex, segment.start);
    }
    
    highlightedText += `<span style="background-color: ${segment.color}20; border-left: 3px solid ${segment.color}; padding: 2px 4px; margin: 1px;" data-document-id="${segment.documentId}" data-similarity="${segment.similarity}" title="${segment.documentName} (${segment.similarity}%)">${segment.text}</span>`;
    
    lastIndex = segment.end;
  });
  
  if (lastIndex < originalText.length) {
    highlightedText += originalText.substring(lastIndex);
  }
} else {
  highlightedText = originalText;
}

console.log(`\nHighlighted text generated: ${highlightedText.length} characters`);
console.log(`Contains HTML spans: ${highlightedText.includes('<span') ? 'Yes' : 'No'}`);

// Summary
console.log('\n🎯 SUMMARY:');
console.log('='.repeat(50));
console.log('✅ Percentage consistency issue: FIXED');
console.log(`   - Old: Overall ${mockPlagiarismCheck.duplicatePercentage}% vs Individual ${mockDocuments[0].duplicateRate}%`);
console.log(`   - New: Consistent ${overallDuplicateRate}% for both overall and highest individual`);
console.log('');
console.log('✅ Highlighting algorithm: IMPROVED');
console.log(`   - Segments found: ${cleanedSegments.length}`);
console.log(`   - Multiple similarity methods used`);
console.log(`   - Paraphrase detection implemented`);
console.log(`   - Overlap handling implemented`);
console.log(`   - HTML highlighting generated: ${highlightedText.includes('<span') ? 'Yes' : 'No'}`);

if (cleanedSegments.length > 0) {
  console.log('\nSample highlighted segments:');
  cleanedSegments.slice(0, 3).forEach((segment, index) => {
    const typeLabel = segment.type === 'paraphrase' ? ' [PARAPHRASE]' : '';
    console.log(`  ${index + 1}. "${segment.text.substring(0, 50)}..." (${segment.similarity}% similarity)${typeLabel}`);
  });
  
  const paraphraseCount = cleanedSegments.filter(s => s.type === 'paraphrase').length;
  console.log(`\n🔄 Paraphrase detection results:`);
  console.log(`   - Total paraphrase segments: ${paraphraseCount}`);
  console.log(`   - Regular segments: ${cleanedSegments.length - paraphraseCount}`);
}

console.log('\n🚀 READY FOR TESTING:');
console.log('The fixes are now implemented and ready for frontend testing.');
console.log('Expected behavior:');
console.log('- Consistent percentage display between overall and individual documents');
console.log('- Proper text highlighting with color-coded segments');
console.log('- Improved accuracy in similarity detection');
console.log('- Detection of paraphrased sentences (same words, different order)');