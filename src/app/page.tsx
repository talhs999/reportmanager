'use client';

import React, { useState } from 'react';
import ReportForm from '@/components/ReportForm';
import EmployeeHistory from '@/components/EmployeeHistory';
import AdminView from '@/components/AdminView';
import { PenTool, Database, History, LayoutDashboard } from 'lucide-react';

type Tab = 'employee' | 'history' | 'admin';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('employee');

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#030303] flex flex-col items-center justify-start px-4 py-8 md:py-16 text-foreground font-sans">
      
      {/* Decorative animated glow elements in background */}
      <div 
        className="glow-circle bg-purple-600 w-[300px] md:w-[600px] h-[300px] md:h-[600px] top-[-10%] left-[-10%]"
        style={{ animationDelay: '0s' }}
      ></div>
      <div 
        className="glow-circle bg-cyan-600 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bottom-[10%] right-[-10%]"
        style={{ animationDelay: '2s' }}
      ></div>
      <div 
        className="glow-circle bg-indigo-800 w-[200px] md:w-[400px] h-[200px] md:h-[400px] top-[40%] left-[30%]"
        style={{ animationDelay: '4s' }}
      ></div>

      <div className="w-full max-w-5xl z-10 space-y-8 animate-fade-in">
        
        {/* Navigation Header */}
        <header className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5 glow-purple">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 font-black tracking-tighter text-xl">
              R
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide uppercase">Reports Manager</h1>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Live Sync Sync Engine Active</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto">
            <button
              id="tab-employee"
              onClick={() => setActiveTab('employee')}
              className={`flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeTab === 'employee'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Employee Form
            </button>
            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <History className="w-4 h-4" />
              My History
            </button>
            <button
              id="tab-admin"
              onClick={() => setActiveTab('admin')}
              className={`flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin View
            </button>
          </nav>
        </header>

        {/* Dynamic Views Container */}
        <section className="transition-all duration-500 w-full">
          {activeTab === 'employee' && (
            <div className="animate-slide-up">
              <ReportForm />
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="animate-slide-up">
              <EmployeeHistory />
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="animate-slide-up">
              <AdminView />
            </div>
          )}
        </section>

        {/* Global Footer */}
        <footer className="text-center py-4 flex flex-col md:flex-row items-center justify-between text-[10px] text-gray-500 font-semibold uppercase tracking-widest px-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>All systems operational</span>
          </div>
          <div className="mt-2 md:mt-0 flex items-center gap-1">
            <span>Powered by</span>
            <Database className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">Talha</span>
          </div>
        </footer>

      </div>
    </main>
  );
}
