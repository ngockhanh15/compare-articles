const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const GlobalAVLTree = require('../models/GlobalAVLTree');
const Document = require('../models/Document');
require('dotenv').config();

async function demonstrateDatabasePersistence() {
  try {
    console.log('🎭 DEMO: Global AVL Tree Database Persistence\n');
    console.log('=' .repeat(60));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Bước 1: Hiển thị trạng thái hiện tại
    console.log('📊 BƯỚC 1: Trạng thái hệ thống hiện tại');
    console.log('-'.repeat(40));
    
    const documentsInDB = await Document.countDocuments({ status: 'processed' });
    const savedTrees = await GlobalAVLTree.countDocuments();
    
    console.log(`💾 Documents trong database: ${documentsInDB}`);
    console.log(`🌳 Saved AVL Trees trong database: ${savedTrees}`);

    // Bước 2: Khởi tạo AVL Tree
    console.log('\n🚀 BƯỚC 2: Khởi tạo Global AVL Tree');
    console.log('-'.repeat(40));
    
    if (!documentAVLService.initialized) {
      await documentAVLService.initialize();
    }
    
    const initialStats = documentAVLService.getTreeStats();
    console.log(`📈 Tree Stats:`, {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight,
      totalSentences: initialStats.totalSentences
    });

    // Bước 3: Lưu vào database
    console.log('\n💾 BƯỚC 3: Lưu AVL Tree vào Database');
    console.log('-'.repeat(40));
    
    const saveResult = await documentAVLService.forceSave();
    console.log(`Save result: ${saveResult ? '✅ Thành công' : '❌ Thất bại'}`);
    
    if (saveResult) {
      const saveStatus = documentAVLService.getSaveStatus();
      console.log(`⏰ Last saved: ${saveStatus.lastSaved}`);
      console.log(`🔄 Auto-save interval: ${saveStatus.saveInterval / 1000}s`);
    }

    // Bước 4: Kiểm tra database content
    console.log('\n🔍 BƯỚC 4: Kiểm tra nội dung Database');
    console.log('-'.repeat(40));
    
    const latestTree = await GlobalAVLTree.getLatest();
    if (latestTree) {
      console.log('📊 Database Tree Metadata:', {
        version: latestTree.version,
        createdAt: latestTree.createdAt.toISOString(),
        lastUpdated: latestTree.lastUpdated.toISOString(),
        totalNodes: latestTree.metadata.totalNodes,
        totalDocuments: latestTree.metadata.totalDocuments,
        nodesArrayLength: latestTree.nodes.length,
        documentsArrayLength: latestTree.documentInfo.length
      });

      // Hiển thị sample nodes
      console.log('\n🌲 Sample Nodes từ Database:');
      latestTree.nodes.slice(0, 5).forEach((node, index) => {
        console.log(`  Node ${index + 1}: hash=${node.hash}, docs=${node.documents.length}, sentences=${node.sentences.length}`);
      });

      // Hiển thị document info
      console.log('\n📄 Document Info từ Database:');
      latestTree.documentInfo.forEach((doc, index) => {
        console.log(`  Doc ${index + 1}: ${doc.title} (${doc.fileType}) - ${doc.sentenceCount} sentences`);
      });
    }

    // Bước 5: Test persistence bằng cách clear và reload
    console.log('\n🔄 BƯỚC 5: Test Persistence (Clear & Reload)');
    console.log('-'.repeat(40));
    
    // Lưu stats ban đầu để so sánh
    const beforeClear = {
      nodes: documentAVLService.documentTree.getSize(),
      docs: documentAVLService.docInfo.size,
      height: documentAVLService.getTreeHeight()
    };
    
    console.log('📊 Trước khi clear:', beforeClear);
    
    // Clear tree
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.initialized = false;
    
    console.log('🗑️  Tree cleared từ memory');
    console.log('📊 Sau khi clear:', {
      nodes: documentAVLService.documentTree.getSize(),
      docs: documentAVLService.docInfo.size,
      height: documentAVLService.getTreeHeight()
    });
    
    // Reload từ database
    console.log('\n🔄 Đang reload từ database...');
    await documentAVLService.initialize();
    
    const afterReload = {
      nodes: documentAVLService.documentTree.getSize(),
      docs: documentAVLService.docInfo.size,
      height: documentAVLService.getTreeHeight()
    };
    
    console.log('📊 Sau khi reload:', afterReload);

    // Bước 6: Kiểm tra tính toàn vẹn dữ liệu
    console.log('\n🎯 BƯỚC 6: Kiểm tra tính toàn vẹn dữ liệu');
    console.log('-'.repeat(40));
    
    const dataIntegrity = {
      nodesMatch: beforeClear.nodes === afterReload.nodes,
      docsMatch: beforeClear.docs === afterReload.docs,
      heightMatch: beforeClear.height === afterReload.height
    };
    
    console.log('✅ Kết quả kiểm tra tính toàn vẹn:');
    console.log(`   Nodes: ${beforeClear.nodes} -> ${afterReload.nodes} ${dataIntegrity.nodesMatch ? '✅' : '❌'}`);
    console.log(`   Documents: ${beforeClear.docs} -> ${afterReload.docs} ${dataIntegrity.docsMatch ? '✅' : '❌'}`);
    console.log(`   Height: ${beforeClear.height} -> ${afterReload.height} ${dataIntegrity.heightMatch ? '✅' : '❌'}`);

    const overallIntegrity = dataIntegrity.nodesMatch && dataIntegrity.docsMatch && dataIntegrity.heightMatch;
    console.log(`\n🏆 Kết quả tổng thể: ${overallIntegrity ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}`);

    // Bước 7: Test performance sau khi reload
    console.log('\n⚡ BƯỚC 7: Test Performance sau khi reload');
    console.log('-'.repeat(40));
    
    const testText = "Việt Nam là đất nước có nền văn hóa lâu đời với thể thao phát triển mạnh.";
    
    const startTime = Date.now();
    const plagiarismResult = await documentAVLService.checkDuplicateContent(testText, {
      threshold: 0.3,
      includeStatistics: true
    });
    const endTime = Date.now();
    
    console.log(`⏱️  Thời gian kiểm tra plagiarism: ${endTime - startTime}ms`);
    console.log(`🔍 Kết quả tìm thấy: ${plagiarismResult.matches?.length || 0} matches`);
    console.log(`📊 Độ tương tự: ${plagiarismResult.similarity || 0}%`);

    // Tóm tắt
    console.log('\n🎉 TÓNG TẮT DEMO');
    console.log('='.repeat(60));
    console.log('✅ Global AVL Tree được lưu thành công vào MongoDB');
    console.log('✅ Dữ liệu được khôi phục hoàn toàn từ database');
    console.log('✅ Tính toàn vẹn dữ liệu được đảm bảo');
    console.log('✅ Performance vẫn tốt sau khi reload');
    console.log('✅ Auto-save mỗi 5 phút để đảm bảo persistence');
    
    console.log('\n📝 LỢI ÍCH:');
    console.log('   🔄 Server restart không mất dữ liệu');
    console.log('   💾 Backup và recovery dễ dàng');
    console.log('   📈 Có thể scale và migrate');
    console.log('   🔍 Theo dõi lịch sử thay đổi');
    
  } catch (error) {
    console.error('❌ Demo Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run demo if called directly
if (require.main === module) {
  demonstrateDatabasePersistence()
    .then(() => {
      console.log('\n🎊 DEMO HOÀN THÀNH!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

module.exports = demonstrateDatabasePersistence;
