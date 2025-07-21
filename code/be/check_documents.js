const mongoose = require('mongoose');
const Document = require('./models/Document');

mongoose.connect('mongodb://localhost:27017/plagiarism_checker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  const totalDocs = await Document.countDocuments();
  console.log('Total documents in database:', totalDocs);
  
  const processedDocs = await Document.countDocuments({ status: 'processed' });
  console.log('Processed documents:', processedDocs);
  
  const docsWithText = await Document.countDocuments({ 
    status: 'processed',
    extractedText: { $exists: true, $ne: '' }
  });
  console.log('Processed documents with extracted text:', docsWithText);
  
  // Show some sample documents
  const sampleDocs = await Document.find({ 
    status: 'processed',
    extractedText: { $exists: true, $ne: '' }
  }).limit(3).select('title fileType extractedText');
  
  console.log('Sample documents:');
  sampleDocs.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.title} (${doc.fileType}) - Text length: ${doc.extractedText?.length || 0}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});