export interface Report {
  id: string;
  created_at: string;
  employee_name: string;
  report_type: string;
  date_time: string;
  description: string;
}

/**
 * Get the start (Monday) and end (Sunday) of the week for a given date.
 */
export function getWeekRange(dateInput: Date | string) {
  const date = new Date(dateInput);
  const day = date.getDay();
  // Adjust so Monday is first day of the week
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  
  const start = new Date(date);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const year = start.getFullYear();
  const label = `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}, ${year}`;

  // Form a unique week key: e.g. "2026-W25"
  // ISO week calculation
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

  return { start, end, label, weekKey };
}

/**
 * Gets all unique weeks available from a list of reports.
 * Always includes the current week so that it is selectable even if empty.
 */
export function getUniqueWeeks(reports: Report[]) {
  const weeksMap = new Map<string, { weekKey: string; label: string; start: Date }>();
  
  // Always add current week
  const currentRange = getWeekRange(new Date());
  weeksMap.set(currentRange.weekKey, {
    weekKey: currentRange.weekKey,
    label: currentRange.label + " (This Week)",
    start: currentRange.start
  });

  reports.forEach(report => {
    const range = getWeekRange(report.date_time);
    if (!weeksMap.has(range.weekKey)) {
      weeksMap.set(range.weekKey, {
        weekKey: range.weekKey,
        label: range.label,
        start: range.start
      });
    }
  });

  // Sort weeks descending by start date
  return Array.from(weeksMap.values())
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}

/**
 * Play a high-quality synth sound using Web Audio API.
 * Uses a double sine wave tone that mimics modern mobile notification pings.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    
    // Second note (slightly delayed, higher pitch)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain2.gain.setValueAtTime(0.0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);
    
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.error("Failed to play notification audio", e);
  }
}
