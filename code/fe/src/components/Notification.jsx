import { useState, useEffect } from 'react';

const Notification = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose,
  details = null 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: '✅',
          iconBg: 'bg-green-100 text-green-600'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: '❌',
          iconBg: 'bg-red-100 text-red-600'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚠️',
          iconBg: 'bg-yellow-100 text-yellow-600'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100 text-blue-600'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full transform transition-all duration-300 ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
    >
      <div className={`border rounded-lg shadow-lg ${styles.bg}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              <span className="text-sm">{styles.icon}</span>
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${styles.text}`}>
                {message}
              </p>
              {details && (
                <div className={`mt-2 text-xs ${styles.text} opacity-80`}>
                  {typeof details === 'object' ? (
                    <div className="space-y-1">
                      {details.totalFiles && (
                        <div>Tổng số file: {details.totalFiles}</div>
                      )}
                      {details.successCount !== undefined && (
                        <div>Thành công: {details.successCount}</div>
                      )}
                      {details.failedCount !== undefined && details.failedCount > 0 && (
                        <div>Thất bại: {details.failedCount}</div>
                      )}
                    </div>
                  ) : (
                    <div>{details}</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className={`ml-2 flex-shrink-0 text-lg leading-none ${styles.text} opacity-60 hover:opacity-100`}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;