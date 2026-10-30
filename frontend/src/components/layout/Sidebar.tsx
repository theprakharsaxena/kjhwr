import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Fan, 
  BarChart2, 
  TrendingUp, 
  CheckCircle2, 
  History, 
  FileText
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    {
      to: '/overview',
      label: 'Procurement Overview',
      icon: BarChart2
    },
    {
      to: '/timeline',
      label: 'Forecast Timeline',
      icon: TrendingUp
    },
    {
      to: '/accuracy',
      label: 'Forecast Accuracy',
      icon: CheckCircle2
    },
    {
      to: '/history',
      label: 'Publication History',
      icon: History
    },
    {
      to: '/quality',
      label: 'Data Quality & Notes',
      icon: FileText
    }
  ];

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <Fan className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight">WindScope</span>
          <p className="text-xs text-slate-400">Day-Ahead Intelligence</p>
        </div>
      </div>

      {/* Target Period info */}
      <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800 text-xs">
        <div className="text-slate-400 font-medium">Dataset Period</div>
        <div className="text-white font-medium mt-0.5">January 1–31, 2026</div>
        <div className="text-[11px] text-slate-400 mt-0.5">UK Local Time (GMT)</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="font-medium text-slate-300">Data Sources</div>
        <div className="text-[11px]">Actuals: FUELHH (WIND)</div>
        <div className="text-[11px]">Forecast: WINDFOR</div>
      </div>
    </aside>
  );
};
