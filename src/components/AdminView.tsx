'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Lock, KeyRound, CalendarCheck, BarChart3, Users, 
  Award, RefreshCw, Volume2, VolumeX, Search, 
  ArrowUpRight, AlertCircle, FileText, CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { Report, getWeekRange, getUniqueWeeks, playNotificationSound } from '@/lib/utils';

interface ActiveToast {
  id: string;
  name: string;
  type: string;
}

export default function AdminView() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Real-time toast state
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  // Weekly filters
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-authenticate in development or if already marked in session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authState = sessionStorage.getItem('admin_authenticated');
      if (authState === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const { data, error: dbError } = await supabase
          .from('reports')
          .select('*')
          .order('date_time', { ascending: false });

        if (dbError) throw dbError;

        const allReports = data || [];
        setReports(allReports);
        
        // Default select to current week
        const currentWeek = getWeekRange(new Date());
        setSelectedWeekKey(currentWeek.weekKey);
      } catch (err: any) {
        console.error("Supabase fetch error:", err);
        const errMsg = err?.message || 'Error fetching reports from Supabase database.';
        if (errMsg.includes('relation "public.reports" does not exist') || err?.code === '42P01') {
          setError('Database table missing: The "reports" table does not exist in Supabase yet. Please copy the SQL code from walkthrough.md and run it in your Supabase SQL Editor.');
        } else {
          setError(`Supabase Database Error: ${errMsg}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    // Subscribe to real-time insert channel
    const reportsChannel = supabase
      .channel('public:reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          const eventType = payload.eventType;

          if (eventType === 'INSERT') {
            const newReport = payload.new as Report;
            setReports((prev) => [newReport, ...prev]);

            // Handle sound effect
            if (soundEnabled) {
              playNotificationSound();
            }

            // Trigger toast
            const newToast: ActiveToast = {
              id: newReport.id,
              name: newReport.employee_name,
              type: newReport.report_type
            };
            setToasts((prev) => [newToast, ...prev]);

            // Auto remove toast after 5 seconds
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== newReport.id));
            }, 5000);
          } else if (eventType === 'UPDATE') {
            const updatedReport = payload.new as Report;
            setReports((prev) => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
          } else if (eventType === 'DELETE') {
            const deletedReport = payload.old as Report;
            setReports((prev) => prev.filter(r => r.id !== deletedReport.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
    };
  }, [isAuthenticated, soundEnabled]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple PIN check (admin123)
    if (pin === 'admin123') {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_authenticated', 'true');
      }
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // Logout/Lock handler
  const handleLock = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_authenticated');
    }
    setPin('');
  };

  // Helpers to calculate stats for the selected week
  const uniqueWeeks = getUniqueWeeks(reports);
  const selectedWeekObj = uniqueWeeks.find(w => w.weekKey === selectedWeekKey) || uniqueWeeks[0];

  // Filter reports belonging to selected week AND matching search terms
  const weeklyReports = reports.filter(report => {
    const range = getWeekRange(report.date_time);
    return range.weekKey === selectedWeekKey;
  });

  const filteredReports = weeklyReports.filter(report => {
    const term = searchTerm.toLowerCase();
    return (
      report.employee_name.toLowerCase().includes(term) ||
      report.description.toLowerCase().includes(term) ||
      report.report_type.toLowerCase().includes(term)
    );
  });

  // Calculate Metrics
  const totalReportsCount = weeklyReports.length;

  // Breakdown by Report Type
  const typeCounts: Record<string, number> = {
    'Basic Report': 0,
    'Standard Report': 0,
    'Premium Report': 0,
    'Executive Report': 0
  };
  weeklyReports.forEach(r => {
    if (typeCounts[r.report_type] !== undefined) {
      typeCounts[r.report_type]++;
    }
  });

  // Breakdown by Employee
  const employeeCounts: Record<string, number> = {};
  weeklyReports.forEach(r => {
    employeeCounts[r.employee_name] = (employeeCounts[r.employee_name] || 0) + 1;
  });

  // Find Top Performer
  let topEmployee = 'None';
  let maxCount = 0;
  Object.entries(employeeCounts).forEach(([name, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topEmployee = name;
    }
  });

  // Access check gating UI
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div className="glass-panel rounded-3xl p-8 max-w-sm w-full glow-purple text-center border border-white/10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-b-full"></div>
          
          <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Admin Panel Gate</h3>
          <p className="text-xs text-gray-400 mb-6">Provide the Admin secret key to access live dashboards and stats.</p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="Enter PIN code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-black/40 border ${
                  pinError ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10'
                } rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm font-medium text-center tracking-widest`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all text-xs uppercase tracking-widest cursor-pointer"
            >
              Verify Credentials
            </button>
          </form>

          {pinError && (
            <p className="text-xs text-red-400 mt-4 animate-wiggle font-semibold">
              Incorrect Admin PIN! Try &quot;admin123&quot;
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className="glass-panel border-l-4 border-l-purple-500 rounded-2xl p-4 shadow-2xl flex gap-3 animate-toast-in items-start"
          >
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-grow">
              <p className="text-xs font-bold text-white uppercase tracking-wider">New Report Received</p>
              <p className="text-sm font-medium text-gray-300 mt-0.5">
                <span className="text-purple-300 font-bold">{t.name}</span> published a <span className="text-cyan-300 font-medium">{t.type}</span>.
              </p>
            </div>
            <button 
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-gray-500 hover:text-gray-300 text-xs font-bold px-1"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Control Header */}
      <div className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/5 relative">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">Live Weekly Summary</h2>
            <p className="text-xs text-gray-400">
              Selected Week: <span className="text-purple-400 font-bold">{selectedWeekObj?.label || 'Calculating...'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Week Selector */}
          <select
            value={selectedWeekKey}
            onChange={(e) => setSelectedWeekKey(e.target.value)}
            className="flex-grow md:flex-grow-0 px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer max-w-[240px]"
          >
            {uniqueWeeks.map(w => (
              <option key={w.weekKey} value={w.weekKey} className="bg-neutral-900 text-white">
                {w.label}
              </option>
            ))}
          </select>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Lock Panel */}
          <button
            onClick={handleLock}
            className="px-4 py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 rounded-xl text-red-300 hover:text-red-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-3xl text-sm animate-fade-in flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Count */}
        <div className="glass-panel border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/20 transition-all hover-lift">
          <div className="absolute top-0 right-0 p-8 opacity-5 -translate-y-2 translate-x-2 text-purple-500 group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-24 h-24" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reports Completed</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-white block leading-none mb-1">
            {loading ? '...' : totalReportsCount}
          </span>
          <span className="text-xs text-gray-500 block">in the selected week</span>
        </div>

        {/* Top Performer */}
        <div className="glass-panel border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-cyan-500/20 transition-all hover-lift">
          <div className="absolute top-0 right-0 p-8 opacity-5 -translate-y-2 translate-x-2 text-cyan-500 group-hover:scale-110 transition-transform">
            <Award className="w-24 h-24" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weekly Star</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-white block leading-none truncate mb-1">
            {loading ? '...' : topEmployee}
          </span>
          <span className="text-xs text-gray-500 block">
            {maxCount > 0 ? `Lead with ${maxCount} submissions` : 'No submissions yet'}
          </span>
        </div>

        {/* Real-time Status */}
        <div className="glass-panel border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/20 transition-all hover-lift">
          <div className="absolute top-0 right-0 p-8 opacity-5 -translate-y-2 translate-x-2 text-emerald-500 group-hover:scale-110 transition-transform">
            <RefreshCw className="w-24 h-24" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sync Connection</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-400 block leading-none mb-1">
            ACTIVE LIVE
          </span>
          <span className="text-xs text-gray-500 block">Real-time DB synced</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (Progress Bars) */}
        <div className="glass-panel border border-white/5 rounded-3xl p-6 lg:col-span-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Report Distribution</h3>
          </div>

          <div className="space-y-5 flex-grow flex flex-col justify-center">
            {Object.entries(typeCounts).map(([type, count]) => {
              const pct = totalReportsCount > 0 ? Math.round((count / totalReportsCount) * 100) : 0;
              
              // Colors matching the tags
              let colorClass = 'bg-neutral-600';
              if (type === 'Executive Report') colorClass = 'bg-purple-500 glow-purple';
              if (type === 'Premium Report') colorClass = 'bg-amber-500';
              if (type === 'Standard Report') colorClass = 'bg-cyan-500 glow-cyan';

              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300">{type}</span>
                    <span className="text-gray-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee Contributions */}
        <div className="glass-panel border border-white/5 rounded-3xl p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Employee Leaderboard</h3>
          </div>

          <div className="flex-grow max-h-[220px] overflow-y-auto pr-1 space-y-3">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin"></div>
              </div>
            ) : Object.keys(employeeCounts).length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500 font-medium">
                No submissions recorded for this week
              </div>
            ) : (
              Object.entries(employeeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count], index) => {
                  const maxWeekly = Math.max(...Object.values(employeeCounts));
                  const percentWidth = maxWeekly > 0 ? (count / maxWeekly) * 100 : 0;
                  
                  return (
                    <div key={name} className="flex items-center gap-3">
                      {/* Rank badge */}
                      <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center border shrink-0 ${
                        index === 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        index === 1 ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' :
                        'bg-white/5 text-gray-400 border-white/5'
                      }`}>
                        {index + 1}
                      </span>
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-white truncate">{name}</span>
                          <span className="text-xs font-black text-cyan-400">{count} {count === 1 ? 'report' : 'reports'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Raw Reports Table log */}
      <div className="glass-panel border border-white/5 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Activity Feed</h3>
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search reports in active week..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-xs font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-400 rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500">Fetching live database...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-2xl">
            No reports match search parameters in this week
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-white/5 font-semibold">
                  <th className="pb-3 pr-4 font-bold tracking-wider uppercase text-[10px]">Employee</th>
                  <th className="pb-3 pr-4 font-bold tracking-wider uppercase text-[10px]">Category</th>
                  <th className="pb-3 pr-4 font-bold tracking-wider uppercase text-[10px]">Timestamp</th>
                  <th className="pb-3 font-bold tracking-wider uppercase text-[10px]">Work Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-3.5 pr-4 font-bold text-white align-top whitespace-nowrap">
                      {report.employee_name}
                    </td>
                    <td className="py-3.5 pr-4 align-top whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        report.report_type === 'Executive Report' ? 'bg-purple-900/40 text-purple-300 border border-purple-800/20' :
                        report.report_type === 'Premium Report' ? 'bg-amber-900/40 text-amber-300 border border-amber-800/20' :
                        report.report_type === 'Standard Report' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/20' :
                        'bg-neutral-800/50 text-neutral-300'
                      }`}>
                        {report.report_type}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-gray-500 align-top whitespace-nowrap font-medium">
                      {new Date(report.date_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 text-gray-300 font-medium align-top max-w-sm md:max-w-md break-words leading-relaxed whitespace-pre-wrap">
                      {report.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
