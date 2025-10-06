import React, { useState, useRef, useEffect } from 'react';
import { useUserStats } from '../../hooks/useUserStats';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface UserQuickStatsPopoverProps {
  userId: string;
  username: string;
  avatarPath: string | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export const UserQuickStatsPopover: React.FC<UserQuickStatsPopoverProps> = ({
  userId,
  username,
  avatarPath,
  isOpen,
  onClose,
  position
}) => {
  const { stats, isLoading } = useUserStats(userId);
  const { avatarUrl, isLoading: avatarLoading } = useAvatarUrl(avatarPath);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRatio = (ratio: number) => {
    if (ratio === 999.99) return '∞';
    return ratio.toFixed(2);
  };

  // Prepare chart data
  const chartData = stats?.profit_series.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    profit: item.profit
  })) || [];

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.max(position.y, 10),
      }}
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        {avatarLoading ? (
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
        ) : (
          <img
            src={avatarUrl || ''}
            alt={`${username}'s avatar`}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{username}</h3>
          <p className="text-sm text-gray-500">Player Statistics</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      ) : stats ? (
        <div className="space-y-3">
          {/* Win/Loss Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
              <p className="text-xs text-gray-500">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
              <p className="text-xs text-gray-500">Losses</p>
            </div>
          </div>

          {/* Win/Loss Ratio */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              W/L Ratio: {formatRatio(stats.win_loss_ratio)}
            </p>
          </div>

          {/* Financial Stats */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Wagered:</span>
              <span className="text-sm font-medium">{formatCurrency(stats.total_wagered)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Won:</span>
              <span className="text-sm font-medium">{formatCurrency(stats.total_won)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Net Profit:</span>
              <span className={`text-sm font-medium ${
                stats.total_won - stats.total_wagered >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stats.total_won - stats.total_wagered)}
              </span>
            </div>
          </div>

          {/* Profit Chart */}
          {chartData.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">7-Day Profit Trend</h4>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#6366F1"
                      fill="#6366F1"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No statistics available</p>
      )}
    </div>
  );
};
