// ==========================================
// THEME
// ==========================================
function initTheme() {
  const saved = localStorage.getItem('esrace-theme');
  const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.setAttribute('aria-checked', String(isDark));
}
initTheme();

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('esrace-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeToggle').setAttribute('aria-checked', String(isDark));
});

// ==========================================
// CONFIG
// ==========================================
// const API_BASE = 'http://localhost:8787/api/v1';
const API_BASE = 'https://esrace-backend.esrace.workers.dev/api/v1';

// ==========================================
// VIOLATION TYPE LABELS
// ==========================================
const TYPE_ERR_LABELS = {
  0: 'Local rule violation',
  1: 'Duplicate activity',
  2: 'Invalid/incomplete data',
  3: 'Too short',
  4: 'Wrong activity type',
  5: 'GPS error',
  6: 'Daily limit exceeded',
  7: 'Abnormal speed pattern',
  8: 'Manual entry',
  9: 'Speed out of range',
  10: 'Fast lap detected'
};

// ==========================================
// ICONS (Font Awesome 6)
// ==========================================
const ICONS = {
  runner:      '<i class="fa-solid fa-person-running" style="color:#FFD43B"></i>',  // amber — energy, movement
  calendar:    '<i class="fa-solid fa-calendar-days" style="color:#74C0FC"></i>',   // sky blue — calm, organized
  distance:    '<i class="fa-solid fa-route" style="color:#CC5DE8"></i>',           // violet — journey, distance
  trophy:      '<i class="fa-solid fa-trophy" style="color:#FFD43B"></i>',          // gold — achievement
  bolt:        '<i class="fa-sharp fa-solid fa-bolt" style="color:#FFD43B"></i>',   // yellow sharp — speed, pace
  users:       '<i class="fa-solid fa-users" style="color:#38D9A9"></i>',           // mint — team, community
  clock:       '<i class="fa-solid fa-clock" style="color:#748FFC"></i>',           // periwinkle — time
  checkCircle: '<i class="fa-solid fa-circle-check" style="color:#51CF66"></i>',   // green — done, finished
  xCircle:     '<i class="fa-solid fa-circle-xmark" style="color:#FF6B6B"></i>',   // coral — error
  shield:      '<i class="fa-solid fa-shield-halved" style="color:#4DABF7"></i>',  // light blue — protection
  info:        '<i class="fa-solid fa-circle-info" style="color:#FFA94D"></i>',    // warm amber — caution
};

// ==========================================
// STATE
// ==========================================
let currentRace = null;
let currentRunners = [];
let currentTeams = [];
let currentSort = 'km';
let currentView = 'runners'; // 'runners' | 'teams'

// ==========================================
// API CALLS
// ==========================================
async function fetchRaces() {
  const res = await fetch(`${API_BASE}/races`);
  if (!res.ok) throw new Error('Failed to fetch races');
  return (await res.json()).data;
}

async function fetchRaceDetails(raceId) {
  const res = await fetch(`${API_BASE}/races/${raceId}`);
  if (!res.ok) throw new Error('Failed to fetch race details');
  return (await res.json()).data;
}

async function fetchTeams(raceId) {
  const res = await fetch(`${API_BASE}/races/${raceId}/teams`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  const json = await res.json();
  return json?.data?.teams || [];
}

async function fetchRunnerActivities(raceId, myvneId) {
  const res = await fetch(`${API_BASE}/races/${raceId}/runners/${myvneId}/activities`);
  if (!res.ok) throw new Error('Failed to fetch activities');
  return (await res.json()).data;
}

// ==========================================
// UTILITIES
// ==========================================
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatDateTime(isoString) {
  const d = new Date(new Date(isoString).getTime() + 7 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function formatPace(paceMinKm) {
  if (!paceMinKm || paceMinKm === 'null') return '-';
  const value = parseFloat(paceMinKm);
  if (isNaN(value) || value <= 0) return '-';
  const min = Math.floor(value);
  const sec = Math.round((value - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

function formatPaceFromMs(speedMs) {
  if (!speedMs || speedMs <= 0) return '-';
  const secondsPerKm = 1000 / speedMs;
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

function getRaceStatus(startTime, endTime) {
  const now = Date.now();
  if (now < startTime) return `${ICONS.clock} Upcoming`;
  if (now > endTime) return `${ICONS.checkCircle} Finished`;
  return `${ICONS.runner} Ongoing`;
}

function getMedalIcon(rank) {
  if (rank === 1) return '<i class="fa-solid fa-medal" style="color:#FFD43B"></i>';
  if (rank === 2) return '<i class="fa-solid fa-medal" style="color:#ADB5BD"></i>';
  if (rank === 3) return '<i class="fa-solid fa-medal" style="color:#CD7F32"></i>';
  return String(rank);
}

function getRankStyle(rank) {
  if (rank === 1) return 'border-yellow-400 bg-yellow-50 dark:bg-[#2a2618] dark:shadow-[0_0_15px_rgba(250,204,21,0.12)] shadow-lg';
  if (rank === 2) return 'border-slate-400 bg-slate-50 dark:bg-[#242a35] dark:shadow-[0_0_12px_rgba(148,163,184,0.1)] shadow-lg';
  if (rank === 3) return 'border-orange-400 bg-orange-50 dark:bg-[#2a2218] dark:shadow-[0_0_12px_rgba(249,115,22,0.1)] shadow-lg';
  return 'border-slate-200 dark:border-[#2a3244] bg-white dark:bg-[#212838]';
}

function getRankCircleStyle(rank) {
  if (rank === 1) return 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-400 text-yellow-800 dark:text-yellow-300';
  if (rank === 2) return 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/20 dark:to-slate-600/20 border-slate-400 text-slate-800 dark:text-slate-300';
  if (rank === 3) return 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-400 text-orange-800 dark:text-orange-300';
  return 'bg-slate-100 dark:bg-[#252d3d] border-slate-300 dark:border-[#333d50] text-slate-600 dark:text-slate-500';
}

function calculateTotalTimeSeconds(totalKm, avgSpeed) {
  if (!totalKm || !avgSpeed || avgSpeed <= 0) return Infinity;
  return (1000 / avgSpeed) * totalKm;
}

// ==========================================
// VIOLATION ICON HELPER
// ==========================================
function renderViolationIcon(violations) {
  if (!violations || violations.total === 0) return '';
  if (!currentRace?.show_invalid_activities) return '';

  const lines = Object.entries(violations.breakdown)
    .map(([code, count]) => `${count} × ${TYPE_ERR_LABELS[parseInt(code)] || 'Unknown error'}`)
    .join('\n');
  const tooltip = `⚠ ${violations.total} invalid activit${violations.total === 1 ? 'y' : 'ies'}\n${lines}`;

  return `<span class="relative inline-block ml-1 group cursor-help">
    <span class="text-orange-400">${ICONS.info}</span>
    <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
      bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-pre z-10 min-w-max shadow-lg">
      ${tooltip.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    </span>
  </span>`;
}

// ==========================================
// INACTIVE BADGE HELPER
// ==========================================
function renderInactiveBadge(isInactive) {
  if (!isInactive) return '';
  return '<span class="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">Inactive</span>';
}

// ==========================================
// GOAL PROGRESS HELPERS
// ==========================================
function getGoalTier(percent) {
  if (percent >= 300) return {
    gradient: 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #f97316, #eab308)',
    textClass: 'text-amber-700', badgeText: '👑 LEGEND',
    badgeCls: 'bg-amber-100 text-amber-700',
    glowClass: 'glow-gold', shimmerClass: 'bar-shimmer-intense',
  };
  if (percent >= 250) return {
    gradient: 'linear-gradient(90deg, #2563eb, #7c3aed, #ef4444, #f97316)',
    textClass: 'text-red-600', badgeText: '🔥 2.5x',
    badgeCls: 'bg-red-100 text-red-600',
    glowClass: 'glow-red', shimmerClass: 'bar-shimmer',
  };
  if (percent >= 200) return {
    gradient: 'linear-gradient(90deg, #f59e0b, #f97316, #ef4444)',
    textClass: 'text-orange-600', badgeText: '⚡ 2x',
    badgeCls: 'bg-orange-100 text-orange-600',
    glowClass: 'glow-fire', shimmerClass: 'bar-shimmer',
  };
  if (percent >= 150) return {
    gradient: 'linear-gradient(90deg, #14b8a6, #3b82f6, #6366f1)',
    textClass: 'text-blue-600', badgeText: '💪 1.5x',
    badgeCls: 'bg-blue-100 text-blue-600',
    glowClass: 'glow-blue', shimmerClass: '',
  };
  if (percent >= 100) return {
    gradient: 'linear-gradient(90deg, #059669, #14b8a6)',
    textClass: 'text-emerald-600', badgeText: '✓',
    badgeCls: 'bg-emerald-100 text-emerald-600',
    glowClass: '', shimmerClass: '',
  };
  if (percent >= 75) return { gradient: '#16a34a', textClass: 'text-green-600', badgeText: '', badgeCls: '', glowClass: '', shimmerClass: '' };
  if (percent >= 50) return { gradient: '#d97706', textClass: 'text-amber-600', badgeText: '', badgeCls: '', glowClass: '', shimmerClass: '' };
  if (percent >= 25) return { gradient: '#0891b2', textClass: 'text-cyan-600', badgeText: '', badgeCls: '', glowClass: '', shimmerClass: '' };
  return { gradient: '#3b82f6', textClass: 'text-blue-500', badgeText: '', badgeCls: '', glowClass: '', shimmerClass: '' };
}

function getGoalColor(percent) {
  return getGoalTier(percent).gradient;
}

function getGoalTextColor(percent) {
  return getGoalTier(percent).textClass;
}

function renderProgressBar(percent, totalKm, goalKm) {
  const barWidth = Math.min(percent, 100);
  const tier = getGoalTier(percent);
  const badge = tier.badgeText
    ? ` <span class="text-sm font-bold px-1.5 py-0.5 rounded ${tier.badgeCls}">${tier.badgeText}</span>`
    : '';

  return `
    <div class="mt-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">${totalKm.toFixed(2)} / ${goalKm} km</span>
        <span class="text-xs sm:text-sm font-bold ${tier.textClass}">${percent.toFixed(1)}%${badge}</span>
      </div>
      <div class="w-full bg-slate-200 dark:bg-[#151921] rounded-full h-3 overflow-hidden ${tier.glowClass}">
        <div class="h-full rounded-full transition-all duration-500 relative overflow-hidden ${tier.shimmerClass}" style="width: ${barWidth}%; background: ${tier.gradient};"></div>
      </div>
    </div>
  `;
}

// ==========================================
// RENDERING — RUNNERS (GOAL VIEW)
// ==========================================
function renderGoalLeaderboard(runners) {
  const container = document.getElementById('leaderboard');

  const withGoal = runners.filter(r => r.goal != null);
  const withoutGoal = runners.filter(r => r.goal == null);

  withGoal.sort((a, b) => (b.goal_progress || 0) - (a.goal_progress || 0));
  const sorted = [...withGoal, ...withoutGoal].map((r, i) => ({ ...r, rank: i + 1 }));

  if (sorted.length === 0) {
    container.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-center py-8">No runners yet</p>';
    return;
  }

  container.innerHTML = sorted.map(runner => {
    const isTopThree = runner.rank <= 3;
    const hasGoal = runner.goal != null;
    const percent = runner.goal_progress || 0;

    return `
      <div class="hover:shadow-xl transition-all duration-300 rounded-xl p-3 sm:p-4 border-3 ${getRankStyle(runner.rank)}">
        <div class="flex items-center gap-2 sm:gap-4">
          <div class="flex-shrink-0">
            <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-full ${getRankCircleStyle(runner.rank)} flex items-center justify-center border-2">
              <span class="font-bold text-sm sm:text-lg">${getMedalIcon(runner.rank)}</span>
            </div>
          </div>
          <img
            src="${runner.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(runner.name)}"
            alt="${runner.name}"
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(runner.name)}'"
            class="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover border-3 ${isTopThree ? 'border-primary-400' : 'border-slate-300'} flex-shrink-0 hidden sm:block"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span class="font-semibold text-slate-800 dark:text-slate-100 ${isTopThree ? 'text-sm sm:text-lg' : 'text-sm sm:text-base'} truncate">${runner.name}${renderViolationIcon(runner.violations)}${renderInactiveBadge(runner.is_inactive)}</span>
              ${!runner.is_competitive ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-300">${ICONS.shield}</span>` : ''}
            </div>
            ${hasGoal
              ? renderProgressBar(percent, runner.total_km, runner.goal)
              : '<div class="mt-1 text-xs sm:text-sm text-slate-400">No goal set</div>'
            }
          </div>
          <div class="text-right flex-shrink-0">
            <button
              onclick="showActivities('${currentRace.id}', '${runner.myvne_id}', '${runner.name.replace(/'/g, "\\'")}')"
              class="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline"
            >View details →</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDERING — TEAMS (GOAL VIEW)
// ==========================================
function renderGoalTeams(teams) {
  const container = document.getElementById('leaderboard');

  if (!teams || teams.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No teams yet</p>';
    return;
  }

  const teamsWithGoal = teams.map(team => {
    const teamGoal = team.members.reduce((sum, m) => sum + (m.goal || 0), 0);
    const teamKm = team.members.reduce((sum, m) => sum + (m.total_km || 0), 0);
    const teamProgress = teamGoal > 0 ? (teamKm / teamGoal) * 100 : null;
    return { ...team, team_goal: teamGoal, team_km: teamKm, team_progress: teamProgress };
  });

  const withGoal = teamsWithGoal.filter(t => t.team_goal > 0);
  const withoutGoal = teamsWithGoal.filter(t => t.team_goal === 0);
  withGoal.sort((a, b) => (b.team_progress || 0) - (a.team_progress || 0));
  const sorted = [...withGoal, ...withoutGoal];

  container.innerHTML = sorted.map((team, index) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    const hasGoal = team.team_goal > 0;
    const percent = team.team_progress || 0;

    return `
      <div class="hover:shadow-xl transition-all duration-300 rounded-xl border-3 ${getRankStyle(rank)} overflow-hidden">
        <div class="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
          <div class="flex-shrink-0">
            <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-full ${getRankCircleStyle(rank)} flex items-center justify-center border-2">
              <span class="font-bold text-sm sm:text-lg">${getMedalIcon(rank)}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-slate-800 dark:text-slate-100 ${isTopThree ? 'text-sm sm:text-lg' : 'text-sm sm:text-base'} truncate">${team.name}</div>
            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-0.5">${ICONS.users} ${team.member_count} members • ${ICONS.runner} ${team.total_activities} activities</div>
            ${hasGoal
              ? renderProgressBar(percent, team.team_km, team.team_goal)
              : '<div class="mt-1 text-xs sm:text-sm text-slate-400">No goal set</div>'
            }
          </div>
          <div class="text-right flex-shrink-0">
            <button
              onclick="toggleTeamMembers('${team.team_id}')"
              class="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline"
            >Members ▾</button>
          </div>
        </div>
        <div id="team-members-${team.team_id}" class="team-members-list border-t border-slate-100 dark:border-[#2a3244] bg-slate-50 dark:bg-[#151921] px-3 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3">
          ${team.members.length === 0
            ? '<p class="text-sm text-slate-400">No members</p>'
            : team.members
                .slice()
                .sort((a, b) => (b.goal_progress || 0) - (a.goal_progress || 0))
                .map((m, i) => {
                  const mHasGoal = m.goal != null;
                  const mPercent = m.goal_progress || 0;
                  return `
                    <div class="flex items-center gap-2 sm:gap-3">
                      <span class="text-xs text-slate-400 w-4">${i + 1}</span>
                      <img
                        src="${m.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name)}"
                        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}'"
                        class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-300 flex-shrink-0"
                      />
                      <div class="flex-1 min-w-0">
                        <span class="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 truncate">${m.name}${renderViolationIcon(m.violations)}${renderInactiveBadge(m.is_inactive)}</span>
                        ${mHasGoal
                          ? (() => { const mTier = getGoalTier(mPercent); return `<div class="flex items-center gap-2 mt-1">
                              <div class="flex-1 bg-slate-200 dark:bg-[#151921] rounded-full h-2 overflow-hidden ${mTier.glowClass}">
                                <div class="h-full rounded-full relative overflow-hidden ${mTier.shimmerClass}" style="width: ${Math.min(mPercent, 100)}%; background: ${mTier.gradient};"></div>
                              </div>
                              <span class="text-xs font-semibold ${mTier.textClass}">${mPercent.toFixed(1)}%</span>
                            </div>`; })()
                          : '<div class="text-xs text-slate-400">No goal</div>'
                        }
                      </div>
                      <span class="text-sm font-semibold text-primary-600">${m.total_km.toFixed(2)} km</span>
                    </div>
                  `;
                }).join('')
          }
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDERING — RUNNERS
// ==========================================
function renderLeaderboard(runners) {
  const container = document.getElementById('leaderboard');

  if (!runners || runners.length === 0) {
    container.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-center py-8">No runners yet</p>';
    return;
  }

  container.innerHTML = runners.map(runner => {
    const isTopThree = runner.rank <= 3;
    return `
      <div class="hover:shadow-xl transition-all duration-300 rounded-xl p-3 sm:p-4 border-3 ${getRankStyle(runner.rank)}">
        <div class="flex items-center gap-2 sm:gap-4">
          <div class="flex-shrink-0">
            <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-full ${getRankCircleStyle(runner.rank)} flex items-center justify-center border-2">
              <span class="font-bold text-sm sm:text-lg">${getMedalIcon(runner.rank)}</span>
            </div>
          </div>
          <img
            src="${runner.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(runner.name)}"
            alt="${runner.name}"
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(runner.name)}'"
            class="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover border-3 ${isTopThree ? 'border-primary-400' : 'border-slate-300'} flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span class="font-semibold text-slate-800 dark:text-slate-100 ${isTopThree ? 'text-sm sm:text-lg' : 'text-sm sm:text-base'} truncate">${runner.name}${renderViolationIcon(runner.violations)}${renderInactiveBadge(runner.is_inactive)}</span>
              ${!runner.is_competitive ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-300">${ICONS.shield}</span>` : ''}
            </div>
            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-0.5 sm:mt-1">${ICONS.bolt} ${formatPace(runner.avg_pace)}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-lg sm:text-2xl font-bold ${isTopThree ? 'text-primary-700 dark:text-slate-200' : 'text-primary-600 dark:text-slate-300'}">${runner.total_km} km</div>
            <button
              onclick="showActivities('${currentRace.id}', '${runner.myvne_id}', '${runner.name.replace(/'/g, "\\'")}')"
              class="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium mt-1 hover:underline"
            >View details →</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDERING — TEAMS
// ==========================================
function renderTeams(teams) {
  const container = document.getElementById('leaderboard');

  if (!teams || teams.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No teams yet</p>';
    return;
  }

  container.innerHTML = teams.map((team, index) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    return `
      <div class="hover:shadow-xl transition-all duration-300 rounded-xl border-3 ${getRankStyle(rank)} overflow-hidden">
        <!-- Team header row -->
        <div class="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
          <div class="flex-shrink-0">
            <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-full ${getRankCircleStyle(rank)} flex items-center justify-center border-2">
              <span class="font-bold text-sm sm:text-lg">${getMedalIcon(rank)}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-slate-800 dark:text-slate-100 ${isTopThree ? 'text-sm sm:text-lg' : 'text-sm sm:text-base'} truncate">${team.name}</div>
            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-0.5 sm:mt-1">${ICONS.users} ${team.member_count} members • ${ICONS.runner} ${team.total_activities} activities</div>
          </div>
          <div class="text-right flex-shrink-0 flex flex-col items-end gap-0.5 sm:gap-1">
            <div class="text-lg sm:text-2xl font-bold ${isTopThree ? 'text-primary-700 dark:text-slate-200' : 'text-primary-600 dark:text-slate-300'}">${team.total_km.toFixed(2)} km</div>
            <button
              onclick="toggleTeamMembers('${team.team_id}')"
              class="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline"
            >Members ▾</button>
          </div>
        </div>
        <!-- Expandable member list -->
        <div id="team-members-${team.team_id}" class="team-members-list border-t border-slate-100 dark:border-[#2a3244] bg-slate-50 dark:bg-[#151921] px-3 sm:px-4 py-2 sm:py-3 space-y-1.5 sm:space-y-2">
          ${team.members.length === 0
            ? '<p class="text-sm text-slate-400">No members</p>'
            : team.members
                .slice()
                .sort((a, b) => b.total_km - a.total_km)
                .map((m, i) => `
                  <div class="flex items-center gap-2 sm:gap-3">
                    <span class="text-xs text-slate-400 w-4">${i + 1}</span>
                    <img
                      src="${m.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name)}"
                      onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}'"
                      class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-300 flex-shrink-0"
                    />
                    <span class="flex-1 text-xs sm:text-sm font-medium text-slate-700 truncate">${m.name}${renderViolationIcon(m.violations)}${renderInactiveBadge(m.is_inactive)}</span>
                    <span class="text-xs sm:text-sm text-slate-500 hidden sm:inline">${ICONS.bolt} ${formatPace(m.avg_pace)}</span>
                    <span class="text-xs sm:text-sm font-semibold text-primary-600">${m.total_km.toFixed(2)} km</span>
                  </div>
                `).join('')
          }
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDERING — TEAMS (AVG/MEMBER VIEW)
// ==========================================
function renderAvgTeams(teams) {
  const container = document.getElementById('leaderboard');

  if (!teams || teams.length === 0) {
    container.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-center py-8">No teams yet</p>';
    return;
  }

  const sorted = teams
    .map(t => {
      const weightedKm = (t.members || []).reduce((sum, m) => {
        const km = m.total_km || 0;
        return sum + (m.sex === 'female' ? km * 2 : km);
      }, 0);
      const avg_km = t.member_count > 0 ? weightedKm / t.member_count : 0;
      return { ...t, avg_km, weighted_km: weightedKm };
    })
    .sort((a, b) => b.avg_km - a.avg_km);

  container.innerHTML = sorted.map((team, index) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    const memberRows = (team.members || [])
      .map(m => {
        const km = m.total_km || 0;
        const isFemale = m.sex === 'female';
        const weighted = isFemale ? km * 2 : km;
        return { name: m.name, km, weighted, isFemale };
      })
      .sort((a, b) => b.weighted - a.weighted);

    return `
      <div class="hover:shadow-xl transition-all duration-300 rounded-xl border-3 ${getRankStyle(rank)} overflow-hidden">
        <div class="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
          <div class="flex-shrink-0">
            <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-full ${getRankCircleStyle(rank)} flex items-center justify-center border-2">
              <span class="font-bold text-sm sm:text-lg">${getMedalIcon(rank)}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-slate-800 dark:text-slate-100 ${isTopThree ? 'text-sm sm:text-lg' : 'text-sm sm:text-base'} truncate">${team.name}</div>
            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-0.5">${ICONS.users} ${team.member_count} members • ${ICONS.distance} ${team.weighted_km.toFixed(2)} km weighted</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-lg sm:text-2xl font-bold ${isTopThree ? 'text-primary-700 dark:text-slate-200' : 'text-primary-600 dark:text-slate-300'}">${team.avg_km.toFixed(2)} km</div>
            <button onclick="toggleAvgDetail('${team.team_id}')" class="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline">Detail ▾</button>
          </div>
        </div>
        <div id="avg-detail-${team.team_id}" class="team-members-list border-t border-slate-100 dark:border-[#2a3244] bg-slate-50 dark:bg-[#151921] px-3 sm:px-4 py-2 sm:py-3">
          <table class="w-full text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-200/70 dark:bg-[#252d3d]">
                <th class="text-left py-2 px-2 sm:px-3 font-semibold text-slate-600 dark:text-slate-300 rounded-tl-lg">Member</th>
                <th class="text-right py-2 px-2 sm:px-3 font-semibold text-slate-600 dark:text-slate-300">KM</th>
                <th class="text-right py-2 px-2 sm:px-3 font-semibold text-slate-600 dark:text-slate-300 rounded-tr-lg">Weighted</th>
              </tr>
            </thead>
            <tbody>
              ${memberRows.map((m, i) => `
                <tr class="${i % 2 === 0 ? 'bg-white/60 dark:bg-[#1c2230]/60' : 'bg-slate-100/60 dark:bg-[#212838]/60'}">
                  <td class="py-2 px-2 sm:px-3 text-slate-700 dark:text-slate-300 truncate max-w-[120px] sm:max-w-none">${m.name}${m.isFemale ? ' <span class="text-xs text-pink-400 dark:text-pink-300">♀ ×2</span>' : ''}</td>
                  <td class="text-right py-2 px-2 sm:px-3 text-slate-500 dark:text-slate-400">${m.km.toFixed(2)}</td>
                  <td class="text-right py-2 px-2 sm:px-3 font-semibold text-slate-700 dark:text-slate-200">${m.weighted.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-slate-200/50 dark:bg-[#252d3d]/80 font-semibold text-slate-700 dark:text-slate-200">
                <td class="py-2 px-2 sm:px-3">Total (${team.member_count})</td>
                <td class="text-right py-2 px-2 sm:px-3">${team.total_km.toFixed(2)}</td>
                <td class="text-right py-2 px-2 sm:px-3">${team.weighted_km.toFixed(2)}</td>
              </tr>
              <tr class="bg-primary-50/60 dark:bg-primary-900/15">
                <td class="py-2 px-2 sm:px-3 text-primary-600 dark:text-primary-400 rounded-bl-lg" colspan="2">Final = ${team.weighted_km.toFixed(2)} / ${team.member_count}</td>
                <td class="text-right py-2 px-2 sm:px-3 font-bold text-primary-700 dark:text-primary-300 rounded-br-lg">${team.avg_km.toFixed(2)} km</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// ACTIONS
// ==========================================
function collapseRaceSelector() {
  const section = document.getElementById('raceSelectorSection');
  const list = document.getElementById('raceList');
  section.querySelector('h2').classList.add('hidden');
  list.className = 'flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth';
  list.style.cssText = '-webkit-overflow-scrolling: touch; scrollbar-width: thin;';
  list.querySelectorAll('.race-card').forEach(card => {
    card.classList.add('flex-shrink-0', 'w-56', 'snap-start');
  });
}

function expandRaceSelector() {
  const section = document.getElementById('raceSelectorSection');
  const list = document.getElementById('raceList');
  section.querySelector('h2').classList.remove('hidden');
  list.className = 'grid grid-cols-1 md:grid-cols-3 gap-4';
  list.style.cssText = '';
  list.querySelectorAll('.race-card').forEach(card => {
    card.classList.remove('flex-shrink-0', 'w-56', 'snap-start');
  });
}

async function loadRace(raceId) {
  try {
    document.getElementById('raceSection').classList.remove('hidden');
    collapseRaceSelector();
    // Highlight the selected race card
    document.querySelectorAll('.race-card').forEach(c => c.classList.remove('border-primary-500', 'shadow-md'));
    document.querySelector(`.race-card[onclick="loadRace('${raceId}')"]`)?.classList.add('border-primary-500', 'shadow-md');
    document.getElementById('leaderboard').innerHTML = `
      <div class="space-y-3">
        ${Array(5).fill(0).map(() => '<div class="bg-white dark:bg-[#1c2230] rounded-xl p-4 skeleton h-20"></div>').join('')}
      </div>
    `;

    const raceData = await fetchRaceDetails(raceId);
    currentRace = raceData.race;
    currentView = 'runners';
    currentSort = 'km';

    // Populate race header
    document.getElementById('raceName').textContent = currentRace.name;
    document.getElementById('raceDescription').textContent = currentRace.description || '';
    document.getElementById('raceDuration').textContent =
      `${formatDate(currentRace.start_time)} — ${formatDate(currentRace.end_time)}`;
    document.getElementById('totalRunners').textContent = raceData.total_runners;
    document.getElementById('raceStatus').innerHTML = getRaceStatus(currentRace.start_time, currentRace.end_time);

    const totalKm = [...raceData.leaderboard, ...raceData.non_competitive]
      .reduce((sum, r) => sum + (r.total_km || 0), 0);
    document.getElementById('totalDistance').textContent = totalKm.toFixed(2) + ' km';

    // Build ranked runner list
    currentRunners = [...raceData.leaderboard, ...raceData.non_competitive]
      .map(runner => ({
        ...runner,
        total_time_seconds: calculateTotalTimeSeconds(runner.total_km, runner.avg_pace)
      }))
      .sort((a, b) => b.total_km - a.total_km)
      .map((runner, i) => ({ ...runner, rank: i + 1 }));

    // Show/hide goal sort button
    const goalSortBtn = document.getElementById('goalSortBtn');
    goalSortBtn.style.display = currentRace.has_goal ? '' : 'none';

    // Show/hide team tab
    const viewTabs = document.getElementById('viewTabs');
    if (currentRace.team_mode) {
      viewTabs.classList.remove('hidden');
      try {
        currentTeams = await fetchTeams(raceId);
      } catch {
        currentTeams = [];
      }
      setView('teams');
    } else {
      viewTabs.classList.add('hidden');
      currentTeams = [];
      setView('runners');
      renderLeaderboard(currentRunners);
    }

    document.getElementById('raceSection').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Error loading race:', error);
    document.getElementById('leaderboard').innerHTML =
      `<p class="text-red-500 text-center py-8">${ICONS.xCircle} Failed to load race data</p>`;
  }
}

async function showActivities(raceId, myvneId, runnerName) {
  try {
    const data = await fetchRunnerActivities(raceId, myvneId);
    renderActivities(data.activities, runnerName, data.stats);
  } catch (error) {
    console.error('Error loading activities:', error);
    alert('Failed to load activities');
  }
}

function sortLeaderboard(sortType) {
  currentSort = sortType;

  if (sortType === 'avg') {
    renderAvgTeams(currentTeams);
  } else if (sortType === 'goal') {
    if (currentView === 'runners') {
      renderGoalLeaderboard(currentRunners);
    } else {
      renderGoalTeams(currentTeams);
    }
  } else if (currentView === 'runners') {
    const sorted = [...currentRunners];
    if (sortType === 'km') {
      sorted.sort((a, b) => b.total_km - a.total_km);
    } else if (sortType === 'pace') {
      sorted.sort((a, b) => (parseFloat(a.avg_pace) || Infinity) - (parseFloat(b.avg_pace) || Infinity));
    }
    currentRunners = sorted.map((runner, i) => ({ ...runner, rank: i + 1 }));
    renderLeaderboard(currentRunners);
  } else {
    renderTeams(currentTeams);
  }

  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-sort="${sortType}"]`)?.classList.add('active');
}

function setView(view) {
  currentView = view;
  const sortButtons = document.getElementById('sortButtons');
  const paceBtn = document.querySelector('[data-sort="pace"]');

  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  sortButtons.classList.remove('hidden');

  const avgBtn = document.getElementById('avgSortBtn');

  if (view === 'runners') {
    paceBtn.style.display = '';
    avgBtn.style.display = 'none';
    if (currentSort === 'avg') {
      currentSort = 'km';
      document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector('[data-sort="km"]').classList.add('active');
    }
    if (currentSort === 'goal') {
      renderGoalLeaderboard(currentRunners);
    } else {
      renderLeaderboard(currentRunners);
    }
  } else {
    paceBtn.style.display = 'none';
    avgBtn.style.display = '';
    if (currentSort === 'pace') {
      currentSort = 'km';
      document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector('[data-sort="km"]').classList.add('active');
    }
    if (currentTeams.length === 0) {
      document.getElementById('leaderboard').innerHTML = `
        <div class="space-y-3">
          ${Array(3).fill(0).map(() => '<div class="bg-white dark:bg-[#1c2230] rounded-xl p-4 skeleton h-20"></div>').join('')}
        </div>
      `;
      fetchTeams(currentRace.id).then(teams => {
        currentTeams = teams || [];
        if (currentView === 'teams') {
          if (currentSort === 'avg') renderAvgTeams(currentTeams);
          else if (currentSort === 'goal') renderGoalTeams(currentTeams);
          else renderTeams(currentTeams);
        }
      }).catch(() => {
        if (currentView === 'teams') {
          document.getElementById('leaderboard').innerHTML =
            `<p class="text-red-500 text-center py-8">${ICONS.xCircle} Failed to load teams</p>`;
        }
      });
    } else {
      if (currentSort === 'avg') renderAvgTeams(currentTeams);
      else if (currentSort === 'goal') renderGoalTeams(currentTeams);
      else renderTeams(currentTeams);
    }
  }
}

function toggleAvgDetail(teamId) {
  const el = document.getElementById(`avg-detail-${teamId}`);
  if (!el) return;
  el.classList.toggle('open');
  const btn = el.previousElementSibling?.querySelector('button[onclick*="toggleAvgDetail"]');
  if (btn) btn.textContent = el.classList.contains('open') ? 'Detail ▴' : 'Detail ▾';
}

function toggleTeamMembers(teamId) {
  const el = document.getElementById(`team-members-${teamId}`);
  if (!el) return;
  el.classList.toggle('open');
  // Update button label
  const btn = el.previousElementSibling?.querySelector('button[onclick]');
  if (btn) btn.textContent = el.classList.contains('open') ? 'Members ▴' : 'Members ▾';
}

// ==========================================
// RENDERING — ACTIVITIES MODAL
// ==========================================
function renderActivities(activities, runnerName, stats) {
  document.getElementById('modalRunnerName').textContent = runnerName;
  document.getElementById('modalRunnerStats').textContent =
    `${stats.total_km} km • ${stats.total_activities} activities • Avg pace: ${formatPace(stats.avg_pace_min_km)}`;

  const content = document.getElementById('modalContent');
  if (!activities || activities.length === 0) {
    content.innerHTML = '<p class="text-slate-500 text-center py-8">No activities found</p>';
  } else {
    content.innerHTML = `
      <div class="space-y-2 sm:space-y-3">
        ${activities.map((a, idx) => {
          const invalid = !a.is_counted;
          const reason = invalid && a.type_err != null && a.type_err !== 0 ? (TYPE_ERR_LABELS[a.type_err] || 'Invalid') : null;
          const zebra = !invalid && idx % 2 === 1 ? 'bg-slate-100 dark:bg-[#252d3d]' : 'bg-slate-50 dark:bg-[#1c2230]/60';
          return `
          <div class="${invalid ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40' : zebra} rounded-lg p-3 sm:p-4 transition">
            <div class="flex items-start justify-between mb-1.5 sm:mb-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span class="font-semibold text-sm sm:text-base ${invalid ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'} truncate">${a.name}</span>
                  ${invalid ? `<span class="text-xs px-1.5 sm:px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium"><i class="fa-solid fa-ban"></i> ${reason}</span>` : ''}
                </div>
                <div class="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">${formatDateTime(a.start_date_formatted)}</div>
              </div>
              <div class="text-right flex-shrink-0 ml-2">
                <div class="font-bold text-sm sm:text-base ${invalid ? 'line-through text-slate-400' : 'text-primary-600 dark:text-slate-300'}">${a.distance_km} km</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${a.moving_time_formatted}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t ${invalid ? 'border-red-200 dark:border-red-800' : 'border-slate-200 dark:border-slate-600'}">
              <div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Distance</div>
                <div class="text-xs sm:text-sm font-medium ${invalid ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}">${a.distance_km} km</div>
              </div>
              <div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Avg HR</div>
                <div class="text-xs sm:text-sm font-medium ${invalid ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}">${a.average_heartrate || '-'} bpm</div>
              </div>
              <div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Pace</div>
                <div class="text-xs sm:text-sm font-medium ${invalid ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}">${formatPaceFromMs(a.average_speed_ms)}</div>
              </div>
            </div>
          </div>
        `}).join('')}
      </div>
    `;
  }

  document.getElementById('activityModal').classList.remove('hidden');
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('raceSection').classList.add('hidden');
  expandRaceSelector();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('activityModal').classList.add('hidden');
});

document.getElementById('activityModal').addEventListener('click', e => {
  if (e.target.id === 'activityModal') {
    document.getElementById('activityModal').classList.add('hidden');
  }
});

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => sortLeaderboard(btn.dataset.sort));
});

document.querySelectorAll('.view-tab').forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

// ==========================================
// GLOBAL FUNCTIONS (used from inline onclick)
// ==========================================
window.loadRace = loadRace;
window.showActivities = showActivities;
window.toggleTeamMembers = toggleTeamMembers;
window.toggleAvgDetail = toggleAvgDetail;

// ==========================================
// INIT
// ==========================================
async function init() {
  try {
    const races = await fetchRaces();
    renderRaceList(races);
  } catch (error) {
    console.error('Error loading races:', error);
    document.getElementById('raceList').innerHTML =
      `<p class="text-red-500">${ICONS.xCircle} Failed to load races</p>`;
  }
}

function renderRaceList(races) {
  const container = document.getElementById('raceList');
  if (!races || races.length === 0) {
    container.innerHTML = '<p class="text-slate-500">No races available</p>';
    return;
  }
  container.innerHTML = races.map(race => {
    const status = getRaceStatus(race.start_time, race.end_time);
    return `
      <button
        onclick="loadRace('${race.id}')"
        class="race-card bg-white dark:bg-[#1c2230] hover:shadow-xl transition-all duration-300 rounded-xl p-4 sm:p-6 text-left border-2 border-transparent hover:border-primary-500"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg text-slate-800 dark:text-slate-100">${race.name}</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-[#252d3d] dark:text-slate-400">${status}</span>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">${race.description || ''}</p>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-slate-500 dark:text-slate-400">${ICONS.calendar} ${formatDate(race.start_time)} — ${formatDate(race.end_time)}</span>
          ${race.team_mode ? `<span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">${ICONS.users} Teams</span>` : ''}
        </div>
      </button>
    `;
  }).join('');
}

init();
