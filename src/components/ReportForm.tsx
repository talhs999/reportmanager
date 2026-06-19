'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, ClipboardList, User, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ReportForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState('Standard Report');
  const [desc, setDesc] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Default to current local date/time in the expected format (YYYY-MM-DDTHH:mm)
  useEffect(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
    setDateTime(localISOTime);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !desc.trim() || !dateTime) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccess(false);

    try {
      const { error } = await supabase.from('reports').insert([
        {
          employee_name: name.trim(),
          report_type: type,
          date_time: new Date(dateTime).toISOString(),
          description: desc.trim()
        }
      ]);

      if (error) {
        throw error;
      }

      // Play success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
      });

      setSuccess(true);
      setDesc(''); // clear description
      // reset success message after 4 seconds
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error("Supabase submission error:", err);
      const errMsg = err?.message || 'Database submission failed. Ensure your Supabase settings are active and correct.';
      if (errMsg.includes('relation "public.reports" does not exist') || err?.code === '42P01') {
        setErrorMessage('Database table missing: The "reports" table does not exist in Supabase yet. Please run the SQL setup script in your Supabase SQL Editor.');
      } else {
        setErrorMessage(`Supabase Database Error: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 w-full glow-purple relative overflow-hidden transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
          <ClipboardList className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Submit Daily Work Report</h2>
          <p className="text-xs text-gray-400">Complete the form below to update the live system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-2xl text-sm animate-fade-in flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
            {errorMessage}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-2xl text-sm animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            Report submitted successfully! Database updated.
          </div>
        )}

        {/* Employee Name */}
        <div className="space-y-1.5">
          <label htmlFor="empName" className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
            Employee Name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="empName"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Report Type & Date/Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reportType" className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
              Report Category
            </label>
            <select
              id="reportType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm font-medium appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
                backgroundSize: '16px'
              }}
            >
              <option value="Basic Report" className="bg-neutral-900 text-white">Basic Report</option>
              <option value="Standard Report" className="bg-neutral-900 text-white">Standard Report</option>
              <option value="Premium Report" className="bg-neutral-900 text-white">Premium Report</option>
              <option value="Executive Report" className="bg-neutral-900 text-white">Executive Report</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reportDate" className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
              Date & Time
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="datetime-local"
                id="reportDate"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm font-medium cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Report Description */}
        <div className="space-y-1.5">
          <label htmlFor="reportDesc" className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
            Work Description
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-gray-400">
              <FileText className="w-4 h-4" />
            </span>
            <textarea
              id="reportDesc"
              placeholder="Provide a breakdown of task details, progress updates, or notes..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
              rows={4}
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm font-medium resize-none"
            ></textarea>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-500/10 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Publish Live Report
            </>
          )}
        </button>
      </form>
    </div>
  );
}
