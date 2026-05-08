// ==========================================
// CONFIG
// ==========================================
// const API_BASE = 'http://localhost:8787/api/v1';
const API_BASE = 'https://esrace-backend.esrace.workers.dev/api/v1';

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
  if (now < startTime) return '⏳ Upcoming';
  if (now > endTime) return '✅ Finished';
  return '🏃 Ongoing';
}

function getMedalIcon(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function getRankStyle(rank) {
  if (rank === 1) return 'border-yellow-400 bg-yellow-50 shadow-lg';
  if (rank === 2) return 'border-slate-400 bg-slate-50 shadow-lg';
  if (rank === 3) return 'border-orange-400 bg-orange-50 shadow-lg';
  return 'border-slate-200 bg-white';
}

function getRankCircleStyle(rank) {
  if (rank === 1) return 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-800';
  if (rank === 2) return 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-400 text-slate-800';
  if (rank === 3) return 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-400 text-orange-800';
  return 'bg-slate-100 border-slate-300 text-slate-600';
}

function calculateTotalTimeSeconds(totalKm, avgSpeed) {
  if (!totalKm || !avgSpeed || avgSpeed <= 0) return Infinity;
  return (1000 / avgSpeed) * totalKm;
}

// ==========================================
// RENDERING — RUNNERS
// ==========================================
function renderLeaderboard(runners) {
  const container = document.getElementById('leaderboard');

  if (!runners || runners.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No runners yet</p>';
    return;
  }

  container.innerHTML = runners.map(runner => {
    const isTopThree = runner.rank <= 3;
    return `
      <div class="hover:shadow-xl transition-all duration-300 rounded-xl p-4 border-3 ${getRankStyle(runner.rank)}">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-full ${getRankCircleStyle(runner.rank)} flex items-center justify-center border-2">
              <span class="font-bold text-lg">${getMedalIcon(runner.rank)}</span>
            </div>
          </div>
          <img
            src="${runner.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(runner.name)}"
            alt="${runner.name}"
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(runner.name)}'"
            class="w-14 h-14 rounded-full object-cover border-3 ${isTopThree ? 'border-primary-400' : 'border-slate-300'} flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-slate-800 ${isTopThree ? 'text-lg' : 'text-base'}">${runner.name}</span>
              ${!runner.is_competitive ? '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-300">🛡️</span>' : ''}
            </div>
            <div class="text-sm text-slate-500 mt-1">⚡ ${formatPace(runner.avg_pace)}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-2xl font-bold ${isTopThree ? 'text-primary-700' : 'text-primary-600'}">${runner.total_km} km</div>
            <button
              onclick="showActivities('${currentRace.id}', '${runner.myvne_id}', '${runner.name.replace(/'/g, "\\'")}')"
              class="text-sm text-primary-600 hover:text-primary-800 font-medium mt-1 hover:underline"
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
        <div class="flex items-center gap-4 p-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-full ${getRankCircleStyle(rank)} flex items-center justify-center border-2">
              <span class="font-bold text-lg">${getMedalIcon(rank)}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-slate-800 ${isTopThree ? 'text-lg' : 'text-base'}">${team.name}</div>
            <div class="text-sm text-slate-500 mt-1">👥 ${team.member_count} members • 🏃 ${team.total_activities} activities</div>
          </div>
          <div class="text-right flex-shrink-0 flex flex-col items-end gap-1">
            <div class="text-2xl font-bold ${isTopThree ? 'text-primary-700' : 'text-primary-600'}">${team.total_km.toFixed(2)} km</div>
            <button
              onclick="toggleTeamMembers('${team.team_id}')"
              class="text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline"
            >Members ▾</button>
          </div>
        </div>
        <!-- Expandable member list -->
        <div id="team-members-${team.team_id}" class="team-members-list border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
          ${team.members.length === 0
            ? '<p class="text-sm text-slate-400">No members</p>'
            : team.members
                .slice()
                .sort((a, b) => b.total_km - a.total_km)
                .map((m, i) => `
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-slate-400 w-4">${i + 1}</span>
                    <img
                      src="${m.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name)}"
                      onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}'"
                      class="w-8 h-8 rounded-full object-cover border border-slate-300 flex-shrink-0"
                    />
                    <span class="flex-1 text-sm font-medium text-slate-700">${m.name}</span>
                    <span class="text-sm text-slate-500">⚡ ${formatPaceFromMs(m.avg_pace)}</span>
                    <span class="text-sm font-semibold text-primary-600">${m.total_km.toFixed(2)} km</span>
                  </div>
                `).join('')
          }
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
        ${Array(5).fill(0).map(() => '<div class="bg-white rounded-xl p-4 skeleton h-20"></div>').join('')}
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
    document.getElementById('raceStatus').textContent = getRaceStatus(currentRace.start_time, currentRace.end_time);

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

    // Show/hide team tab
    const viewTabs = document.getElementById('viewTabs');
    if (currentRace.team_mode) {
      viewTabs.classList.remove('hidden');
      // Fetch teams then show teams tab by default
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
      '<p class="text-red-500 text-center py-8">❌ Failed to load race data</p>';
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

  const sorted = [...currentRunners];
  if (sortType === 'km') {
    sorted.sort((a, b) => b.total_km - a.total_km);
  } else if (sortType === 'pace') {
    sorted.sort((a, b) => (parseFloat(a.avg_pace) || Infinity) - (parseFloat(b.avg_pace) || Infinity));
  }

  currentRunners = sorted.map((runner, i) => ({ ...runner, rank: i + 1 }));
  renderLeaderboard(currentRunners);

  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-sort="${sortType}"]`).classList.add('active');
}

function setView(view) {
  currentView = view;
  const sortButtons = document.getElementById('sortButtons');

  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'runners') {
    sortButtons.classList.remove('hidden');
    renderLeaderboard(currentRunners);
  } else {
    sortButtons.classList.add('hidden');
    if (currentTeams.length === 0) {
      // Teams may still be loading — show skeleton then render when ready
      document.getElementById('leaderboard').innerHTML = `
        <div class="space-y-3">
          ${Array(3).fill(0).map(() => '<div class="bg-white rounded-xl p-4 skeleton h-20"></div>').join('')}
        </div>
      `;
      fetchTeams(currentRace.id).then(teams => {
        currentTeams = teams || [];
        if (currentView === 'teams') renderTeams(currentTeams);
      }).catch(() => {
        if (currentView === 'teams') {
          document.getElementById('leaderboard').innerHTML =
            '<p class="text-red-500 text-center py-8">❌ Failed to load teams</p>';
        }
      });
    } else {
      renderTeams(currentTeams);
    }
  }
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
      <div class="space-y-3">
        ${activities.map(a => `
          <div class="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="font-semibold text-slate-800">${a.name}</div>
                <div class="text-sm text-slate-500 mt-1">${formatDateTime(a.start_date_formatted)}</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-primary-600">${a.distance_km} km</div>
                <div class="text-xs text-slate-500">${a.moving_time_formatted}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200">
              <div>
                <div class="text-xs text-slate-500">Distance</div>
                <div class="font-medium text-slate-700">${a.distance_km} km</div>
              </div>
              <div>
                <div class="text-xs text-slate-500">Avg HR</div>
                <div class="font-medium text-slate-700">${a.average_heartrate || '-'} bpm</div>
              </div>
              <div>
                <div class="text-xs text-slate-500">Pace</div>
                <div class="font-medium text-slate-700">${formatPaceFromMs(a.average_speed_ms)}</div>
              </div>
            </div>
          </div>
        `).join('')}
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
      '<p class="text-red-500">❌ Failed to load races</p>';
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
        class="race-card bg-white hover:shadow-xl transition-all duration-300 rounded-xl p-6 text-left border-2 border-transparent hover:border-primary-500"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg text-slate-800">${race.name}</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-slate-100">${status}</span>
        </div>
        <p class="text-sm text-slate-600 mb-3">${race.description || ''}</p>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-slate-500">📅 ${formatDate(race.start_time)} — ${formatDate(race.end_time)}</span>
          ${race.team_mode ? '<span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">👥 Teams</span>' : ''}
        </div>
      </button>
    `;
  }).join('');
}

init();
