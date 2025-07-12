import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSystemStats, initializeSystem, clearCache, getTreeStats } from '../services/api';

const SystemStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [treeStats, setTreeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Kiểm tra quyền admin
  const isAdmin = user?.role === 'admin';

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const [systemResponse, treeResponse] = await Promise.all([
        getSystemStats(),
        getTreeStats()
      ]);
      setStats(systemResponse);
      if (treeResponse.success) {
        setTreeStats(treeResponse.stats);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setError(error.message || 'Lỗi khi lấy thống kê hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSystem = async () => {
    if (!isAdmin) return;
    
    try {
      setIsInitializing(true);
      setError('');
      await initializeSystem();
      await fetchStats(); // Refresh stats after initialization
      alert('Hệ thống đã được khởi tạo lại thành công!');
    } catch (error) {
      console.error('Error initializing system:', error);
      setError(error.message || 'Lỗi khi khởi tạo hệ thống');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleClearCache = async () => {
    if (!isAdmin) return;
    
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ cache? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    try {
      setIsClearingCache(true);
      setError('');
      await clearCache();
      await fetchStats(); // Refresh stats after clearing cache
      alert('Cache đã được xóa thành công!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      setError(error.message || 'Lỗi khi xóa cache');
    } finally {
      setIsClearingCache(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="max-w-4xl px-4 py-8 mx-auto">
          <div className="p-8 text-center bg-white shadow-xl rounded-2xl">
            <div className="mb-4 text-6xl">🚫</div>
            <h2 className="mb-2 text-2xl font-bold text-neutral-800">
              Không có quyền truy cập
            </h2>
            <p className="text-neutral-600">
              Chỉ admin mới có thể xem thống kê hệ thống.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="max-w-6xl px-4 py-8 mx-auto">
          <div className="p-8 text-center bg-white shadow-xl rounded-2xl">
            <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="text-neutral-600">Đang tải thống kê hệ thống...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="max-w-6xl px-4 py-8 mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 mr-3 shadow-lg bg-gradient-primary rounded-2xl">
              <span className="text-3xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-800">
              Thống kê Hệ thống
            </h1>
          </div>
          <p className="text-neutral-600">
            Theo dõi hiệu suất và trạng thái của hệ thống kiểm tra plagiarism
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-6 border border-red-200 bg-red-50 rounded-xl">
            <div className="flex items-center">
              <span className="mr-2 text-red-500">❌</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Admin Controls */}
        <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
            <span className="mr-2">⚙️</span>
            Điều khiển Admin
          </h2>
          <div className="flex gap-4">
            <button
              onClick={handleInitializeSystem}
              disabled={isInitializing}
              className="flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? (
                <>
                  <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Khởi tạo lại hệ thống
                </>
              )}
            </button>
            
            <button
              onClick={handleClearCache}
              disabled={isClearingCache}
              className="flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingCache ? (
                <>
                  <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Đang xóa...
                </>
              ) : (
                <>
                  <span className="mr-2">🗑️</span>
                  Xóa Cache
                </>
              )}
            </button>
            
            <button
              onClick={fetchStats}
              className="flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500"
            >
              <span className="mr-2">🔄</span>
              Làm mới
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Detection System Stats */}
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
                <span className="mr-2">🔍</span>
                Hệ thống Detection
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.detectionSystem?.totalDocuments?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-blue-700">Tổng tài liệu</div>
                  </div>
                  
                  <div className="p-4 border border-green-200 rounded-xl bg-green-50">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.detectionSystem?.totalChunks?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-green-700">Tổng chunks</div>
                  </div>
                </div>
                
                <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-purple-700">Trạng thái khởi tạo:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      stats.detectionSystem?.initialized 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {stats.detectionSystem?.initialized ? '✅ Đã khởi tạo' : '❌ Chưa khởi tạo'}
                    </span>
                  </div>
                </div>
                
                {stats.detectionSystem?.memoryUsage && (
                  <div className="p-4 border border-orange-200 rounded-xl bg-orange-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-orange-700">Bộ nhớ sử dụng:</span>
                      <span className="font-medium text-orange-800">
                        {Math.round(stats.detectionSystem.memoryUsage.heapUsed / 1024 / 1024)}MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cache System Stats */}
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
                <span className="mr-2">⚡</span>
                Hệ thống Cache
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-indigo-200 rounded-xl bg-indigo-50">
                    <div className="text-2xl font-bold text-indigo-600">
                      {stats.cacheSystem?.textCacheSize?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-indigo-700">Text Cache</div>
                  </div>
                  
                  <div className="p-4 border border-pink-200 rounded-xl bg-pink-50">
                    <div className="text-2xl font-bold text-pink-600">
                      {stats.cacheSystem?.chunkCacheSize?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-pink-700">Chunk Cache</div>
                  </div>
                </div>
                
                <div className="p-4 border border-teal-200 rounded-xl bg-teal-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-teal-700">Tỷ lệ hit cache:</span>
                    <span className="font-medium text-teal-800">
                      {stats.cacheSystem?.hitRate || '0%'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="font-medium text-gray-700">Cache Hits:</div>
                    <div className="text-gray-600">{stats.cacheSystem?.cacheHits || 0}</div>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="font-medium text-gray-700">Cache Misses:</div>
                    <div className="text-gray-600">{stats.cacheSystem?.cacheMisses || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AVL Tree Stats */}
        {treeStats && (
          <div className="mt-8">
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
                <span className="mr-2">🌳</span>
                AVL Tree (Hệ thống kiểm tra trùng lặp)
              </h2>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border border-green-200 rounded-xl bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {treeStats.totalDocuments || 0}
                  </div>
                  <div className="text-sm text-green-700">Tài liệu trong cây</div>
                </div>
                
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">
                    {treeStats.initialized ? 'Có' : 'Không'}
                  </div>
                  <div className="text-sm text-blue-700">Đã khởi tạo</div>
                </div>
                
                <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">
                    AVL
                  </div>
                  <div className="text-sm text-purple-700">Cấu trúc dữ liệu</div>
                </div>
              </div>
              
              <div className="p-4 mt-4 border border-yellow-200 rounded-xl bg-yellow-50">
                <div className="flex items-center">
                  <span className="mr-2 text-yellow-600">💡</span>
                  <div className="text-sm text-yellow-700">
                    <strong>AVL Tree</strong> được sử dụng để tối ưu hóa việc tìm kiếm và so sánh nội dung trùng lặp. 
                    Cấu trúc này đảm bảo thời gian tìm kiếm O(log n) và tự động cân bằng.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {stats && (
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-500">
              Cập nhật lần cuối: {new Date(stats.timestamp).toLocaleString('vi-VN')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStats;