'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, UserCheck, Calendar, FileClock, ChevronDown, ChevronUp, Edit2, X, Check } from 'lucide-react';
import { Report, getWeekRange } from '@/lib/utils';

export default function EmployeeHistory() {
  const [searchName, setSearchName] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  // Edit states
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!searched || !searchName.trim()) return;

    const searchTerm = searchName.trim().toLowerCase();

    const channel = supabase
      .channel('employee-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const newReport = payload.new as Report;
            if (newReport.employee_name && newReport.employee_name.toLowerCase() === searchTerm) {
              setReports((currentReports) => {
                // Avoid duplicates if already fetched
                if (currentReports.some((r) => r.id === newReport.id)) return currentReports;
                const updated = [newReport, ...currentReports];
                return updated.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
              });
              // Optionally expand the week folder for the new report
              const range = getWeekRange(newReport.date_time);
              setExpandedWeeks((prev) => ({ ...prev, [range.weekKey]: true }));
            }
          } else if (eventType === 'UPDATE') {
            const updatedReport = payload.new as Report;
            if (updatedReport.employee_name && updatedReport.employee_name.toLowerCase() === searchTerm) {
              setReports((currentReports) => 
                currentReports.map(r => r.id === updatedReport.id ? updatedReport : r)
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searched, searchName]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      // Query reports matching this employee name (case-insensitive)
      const { data, error: dbError } = await supabase
        .from('reports')
        .select('*')
        .ilike('employee_name', searchName.trim())
        .order('date_time', { ascending: false });

      if (dbError) throw dbError;

      setReports(data || []);
      
      // Auto expand the first week
      if (data && data.length > 0) {
        const firstReportRange = getWeekRange(data[0].date_time);
        setExpandedWeeks({ [firstReportRange.weekKey]: true });
      } else {
        setExpandedWeeks({});
      }
    } catch (err: any) {
      console.error("Supabase history fetch error:", err);
      const errMsg = err?.message || 'Unable to fetch history. Verify database connection.';
      if (errMsg.includes('relation "public.reports" does not exist') || err?.code === '42P01') {
        setError('Database table missing: The "reports" table does not exist in Supabase yet. Please ask your administrator to run the setup script.');
      } else {
        setError(`Supabase Database Error: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  const startEditing = (report: Report) => {
    setEditingReportId(report.id);
    setEditDescription(report.description);
  };

  const cancelEditing = () => {
    setEditingReportId(null);
    setEditDescription('');
  };

  const saveEdit = async (reportId: string) => {
    if (!editDescription.trim()) return;
    
    setSavingEdit(true);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ description: editDescription.trim() })
        .eq('id', reportId);
        
      if (updateError) throw updateError;
      
      // Update local state immediately for better UX
      setReports(current => 
        current.map(r => r.id === reportId ? { ...r, description: editDescription.trim() } : r)
      );
      setEditingReportId(null);
    } catch (err: any) {
      console.error("Update error:", err);
      setError(`Failed to update report: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Group reports by week
  const groupedReports: Record<string, { label: string; reports: Report[] }> = {};
  const currentWeekRange = getWeekRange(new Date());
  let thisWeekCount = 0;

  reports.forEach(report => {
    const range = getWeekRange(report.date_time);
    
    // Count how many are in current week
    if (range.weekKey === currentWeekRange.weekKey) {
      thisWeekCount++;
    }

    if (!groupedReports[range.weekKey]) {
      groupedReports[range.weekKey] = {
        label: range.label,
        reports: []
      };
    }
    groupedReports[range.weekKey].reports.push(report);
  });

  const sortedGroupKeys = Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 w-full glow-cyan relative overflow-hidden transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
          <FileClock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">My Submissions Log</h2>
          <p className="text-xs text-gray-400">Search your name to see your complete weekly metrics</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2.5 mb-6">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Type your name to view history..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-2xl cursor-pointer disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Lookup'
          )}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-2xl text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Fetching history...</p>
        </div>
      )}

      {!loading && searched && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/25 border border-white/5 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">
                Completed This Week
              </span>
              <span className="text-2xl font-black text-cyan-400 animate-pulse">{thisWeekCount}</span>
              <span className="text-[10px] text-gray-500 block mt-1">Reports</span>
            </div>
            <div className="bg-black/25 border border-white/5 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">
                Total Submissions
              </span>
              <span className="text-2xl font-black text-white">{reports.length}</span>
              <span className="text-[10px] text-gray-500 block mt-1">Lifetime</span>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="py-10 text-center border border-white/5 bg-black/20 rounded-2xl">
              <UserCheck className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-400">No reports found for &quot;{searchName}&quot;</p>
              <p className="text-xs text-gray-500 mt-1">Double check your spelling or submit a new report</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
                Weekly Folders
              </h3>
              
              {sortedGroupKeys.map(weekKey => {
                const group = groupedReports[weekKey];
                const isExpanded = !!expandedWeeks[weekKey];
                const isCurrentWeek = weekKey === currentWeekRange.weekKey;

                return (
                  <div 
                    key={weekKey} 
                    className="border border-white/5 rounded-2xl bg-black/15 overflow-hidden transition-all duration-200"
                  >
                    {/* Header */}
                    <button
                      onClick={() => toggleWeek(weekKey)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className={`w-4 h-4 ${isCurrentWeek ? 'text-cyan-400' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-sm font-bold text-white leading-none">
                            {group.label}
                            {isCurrentWeek && <span className="ml-2 text-[10px] px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded-full font-medium">Active</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 bg-white/5 text-gray-300 font-bold rounded-lg">
                          {group.reports.length} {group.reports.length === 1 ? 'Report' : 'Reports'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Report List */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/[0.03] space-y-3 divide-y divide-white/5 animate-fade-in">
                        {group.reports.map((report, idx) => (
                          <div key={report.id} className={`pt-3 ${idx === 0 ? '' : 'mt-3'}`}>
                            <div className="flex justify-between items-start mb-1.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                report.report_type === 'Executive Report' ? 'bg-purple-900/40 text-purple-300 border border-purple-800/20' :
                                report.report_type === 'Premium Report' ? 'bg-amber-900/40 text-amber-300 border border-amber-800/20' :
                                report.report_type === 'Standard Report' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/20' :
                                'bg-neutral-800/50 text-neutral-300'
                              }`}>
                                {report.report_type}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {new Date(report.date_time).toLocaleString()}
                                </span>
                                {editingReportId !== report.id && (
                                  <button 
                                    onClick={() => startEditing(report)}
                                    className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-cyan-400 transition-colors"
                                    title="Edit Report"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {editingReportId === report.id ? (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full bg-black/50 border border-cyan-500/30 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 min-h-[100px] resize-y"
                                  placeholder="Edit your report..."
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={cancelEditing}
                                    disabled={savingEdit}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" /> Cancel
                                  </button>
                                  <button
                                    onClick={() => saveEdit(report.id)}
                                    disabled={savingEdit}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {savingEdit ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                      <><Check className="w-3.5 h-3.5" /> Save</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-200 font-medium leading-relaxed whitespace-pre-wrap">
                                {report.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
