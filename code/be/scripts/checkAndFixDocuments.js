const mongoose = require('mongoose');

async function checkDocumentStructure() {
  try {
    console.log('=== CHECKING DOCUMENT STRUCTURE ===');
    
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Sử dụng raw MongoDB query để kiểm tra
    const db = mongoose.connection.db;
    const collection = db.collection('documents');
    
    console.log('\n=== RAW DOCUMENT CHECK ===');
    
    const documents = await collection.find().limit(2).toArray();
    
    documents.forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(`  _id: ${doc._id}`);
      console.log(`  title: ${doc.title}`);
      console.log(`  avlTreeData exists: ${doc.hasOwnProperty('avlTreeData')}`);
      
      if (doc.avlTreeData) {
        console.log(`  avlTreeData type: ${typeof doc.avlTreeData}`);
        console.log(`  avlTreeData keys: ${Object.keys(doc.avlTreeData)}`);
      }
    });
    
    console.log('\n=== MANUAL REMOVAL ===');
    
    const result = await collection.updateMany(
      {},
      { $unset: { avlTreeData: 1 } }
    );
    
    console.log(`Updated ${result.modifiedCount} documents`);
    
    // Verify again
    const docsAfter = await collection.find({ avlTreeData: { $exists: true } }).toArray();
    console.log(`Documents with avlTreeData after manual removal: ${docsAfter.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkDocumentStructure();
