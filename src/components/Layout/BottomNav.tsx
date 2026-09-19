import React from 'react';
import { Users, Bell, TrendingUp, UserCheck } from 'lucide-react';

export type NavTab = 'groups' | 'approvals' | 'activity' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingApprovalsCount,
}) => {
  const tabs = [
    { id: 'groups' as NavTab, label: 'Groups', icon: Users },
    {
      id: 'approvals' as NavTab,
      label: 'Approvals',
      icon: Bell,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'activity' as NavTab, label: 'Activity', icon: TrendingUp },
    { id: 'profile' as NavTab, label: 'My UPI', icon: UserCheck },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full relative transition-all duration-150 active:scale-95 select-none ${
                isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 tracking-tight ${
                  isActive ? 'font-bold text-emerald-700' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-emerald-600 rounded-b-full shadow-xs shadow-emerald-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
