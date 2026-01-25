// ==========================================
// CONFIG
// ==========================================
const API_BASE = 'http://localhost:8787/api/v1';

// ==========================================
// STATE
// ==========================================
let currentRace = null;
let currentRunners = [];
let currentSort = 'km';

// ==========================================
// API CALLS
// ==========================================
async function fetchRaces() {
  const res = await fetch(`${API_BASE}/races`);
  if (!res.ok) throw new Error('Failed to fetch races');
  const data = await res.json();
  return data.data;
}

async function fetchRaceDetails(raceId) {
  const res = await fetch(`${API_BASE}/races/${raceId}`);
  if (!res.ok) throw new Error('Failed to fetch race details');
  const data = await res.json();
  return data.data;
}

async function fetchRunnerActivities(raceId, myvneId) {
  const res = await fetch(`${API_BASE}/races/${raceId}/runners/${myvneId}/activities`);
  if (!res.ok) throw new Error('Failed to fetch activities');
  const data = await res.json();
  return data.data;
}

// ==========================================
// UTILITIES
// ==========================================
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
function formatPaceFromMs(speedMs) {
    if (!speedMs || speedMs <= 0) return "0:00 / km";

    const secondsPerKm = 1000 / speedMs;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')} / km`;
}


function formatDateTime(isoString) {
  const date = new Date(isoString);
  const vnDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  
  const day = vnDate.getUTCDate().toString().padStart(2, '0');
  const month = (vnDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = vnDate.getUTCFullYear();
  const hours = vnDate.getUTCHours().toString().padStart(2, '0');
  const minutes = vnDate.getUTCMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatPace(paceMinKm) {
  if (!paceMinKm || paceMinKm === 'null') return '-';
  const [min, sec] = paceMinKm.split('.');
  const seconds = sec ? Math.round(parseFloat('0.' + sec) * 60) : 0;
  return `${min}:${seconds.toString().padStart(2, '0')} /km`;
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

// ==========================================
// RENDERING
// ==========================================
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
        class="bg-white hover:shadow-xl transition-all duration-300 rounded-xl p-6 text-left border-2 border-transparent hover:border-primary-500"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg text-slate-800">${race.name}</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-slate-100">${status}</span>
        </div>
        <p class="text-sm text-slate-600 mb-3">${race.description || ''}</p>
        <div class="text-xs text-slate-500">
          📅 ${formatDate(race.start_time)} - ${formatDate(race.end_time)}
        </div>
      </button>
    `;
  }).join('');
}

function renderLeaderboard(runners) {
  const container = document.getElementById('leaderboard');
  
  if (!runners || runners.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No data available</p>';
    return;
  }

  container.innerHTML = runners.map(runner => {
    const isTopThree = runner.rank <= 3;
    
    return `
    <div class="hover:shadow-xl transition-all duration-300 rounded-xl p-4 border-3 ${getRankStyle(runner.rank)}">
      <div class="flex items-center gap-4">
        
        <div class="flex-shrink-0 relative">
          <div class="w-12 h-12 rounded-full ${getRankCircleStyle(runner.rank)} flex items-center justify-center border-2">
            <span class="font-bold text-lg">${runner.rank}</span>
          </div>
          ${isTopThree ? `<div class="absolute -top-1 -right-1 text-2xl">${getMedalIcon(runner.rank)}</div>` : ''}
        </div>
        
        <img 
          src="${runner.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(runner.name)}" 
          alt="${runner.name}"
          class="w-14 h-14 rounded-full object-cover border-3 ${isTopThree ? 'border-primary-400' : 'border-slate-300'} flex-shrink-0"
        />
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="font-semibold text-slate-800 ${isTopThree ? 'text-lg' : 'text-base'}">${runner.name}</div>
            ${!runner.is_competitive ? 
              '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-300 flex-shrink-0">🛡️</span>' 
              : 
              // '<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-300 flex-shrink-0">🏆</span>'
              ''
            }
          </div>
          <div class="text-sm text-slate-600 mt-1 flex items-center gap-3 flex-wrap">
            <span>📊 ${runner.total_activities} activities</span>
            <span>⚡ ${formatPace(runner.avg_pace)}</span>
          </div>
        </div>
        
        <div class="text-right flex-shrink-0">
          <div class="text-2xl font-bold ${isTopThree ? 'text-primary-700' : 'text-primary-600'}">${runner.total_km} km</div>
          <button 
            onclick="showActivities('${currentRace.id}', '${runner.myvne_id}', '${runner.name}')"
            class="text-sm text-primary-600 hover:text-primary-800 font-medium mt-1 hover:underline"
          >
            View details →
          </button>
        </div>
        
      </div>
    </div>
  `;
  }).join('');
}

function renderActivities(activities, runnerName, stats) {
  const modal = document.getElementById('activityModal');
  const modalRunnerName = document.getElementById('modalRunnerName');
  const modalRunnerStats = document.getElementById('modalRunnerStats');
  const modalContent = document.getElementById('modalContent');
  
  modalRunnerName.textContent = runnerName;
  modalRunnerStats.textContent = `${stats.total_km} km • ${stats.total_activities} activities • Avg pace: ${formatPace(stats.avg_pace_min_km)}`;

  if (!activities || activities.length === 0) {
    modalContent.innerHTML = '<p class="text-slate-500 text-center py-8">No activities found</p>';
  } else {
    modalContent.innerHTML = `
      <div class="space-y-3">
        ${activities.map(activity => `
          <div class="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="font-semibold text-slate-800">${activity.name}</div>
                <div class="text-sm text-slate-500 mt-1">${formatDateTime(activity.start_date_formatted)}</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-primary-600">${activity.distance_km} km</div>
                <div class="text-xs text-slate-500">${activity.moving_time_formatted}</div>
              </div>
            </div>
            
            <div class="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200">
              <div>
                <div class="text-xs text-slate-500">Pace</div>
                <div class="font-medium text-slate-700">${formatPace(activity.average_pace_min_km)}</div>
              </div>
              <div>
                <div class="text-xs text-slate-500">Avg HR</div>
                <div class="font-medium text-slate-700">${activity.average_heartrate || '-'} bpm</div>
              </div>
              <div>
                <div class="text-xs text-slate-500">Speed</div>
                <div class="font-medium text-slate-700">${formatPaceFromMs(activity.average_speed_ms)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  modal.classList.remove('hidden');
}

// ==========================================
// ACTIONS
// ==========================================
async function loadRace(raceId) {
  try {
    document.getElementById('raceSection').classList.remove('hidden');
    
    document.getElementById('leaderboard').innerHTML = `
      <div class="space-y-3">
        ${Array(5).fill(0).map(() => `
          <div class="bg-white rounded-xl p-4 skeleton h-20"></div>
        `).join('')}
      </div>
    `;
    
    const raceData = await fetchRaceDetails(raceId);
    currentRace = raceData.race;
    
    document.getElementById('raceName').textContent = currentRace.name;
    document.getElementById('raceDescription').textContent = currentRace.description || '';
    document.getElementById('raceDuration').textContent = 
      `${formatDate(currentRace.start_time)} - ${formatDate(currentRace.end_time)}`;
    document.getElementById('totalRunners').textContent = raceData.total_runners;
    
    const totalKm = raceData.leaderboard.reduce((sum, r) => sum + r.total_km, 0) + 
                    raceData.non_competitive.reduce((sum, r) => sum + r.total_km, 0);
    document.getElementById('totalDistance').textContent = totalKm.toFixed(2) + ' km';
    document.getElementById('raceStatus').textContent = getRaceStatus(currentRace.start_time, currentRace.end_time);
    
    currentRunners = [
      ...raceData.leaderboard,
      ...raceData.non_competitive
    ].sort((a, b) => b.total_km - a.total_km)
     .map((runner, index) => ({
       ...runner,
       rank: index + 1  // Re-rank based on combined sorted list
     }));
    
    renderLeaderboard(currentRunners);
    
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
  
  switch (sortType) {
    case 'km':
      sorted.sort((a, b) => b.total_km - a.total_km);
      break;
    case 'pace':
      sorted.sort((a, b) => {
        const paceA = parseFloat(a.avg_pace) || Infinity;
        const paceB = parseFloat(b.avg_pace) || Infinity;
        return paceA - paceB;
      });
      break;
    case 'activities':
      sorted.sort((a, b) => b.total_activities - a.total_activities);
      break;
  }
  
  // Re-rank after sorting
  currentRunners = sorted.map((runner, index) => ({
    ...runner,
    rank: index + 1
  }));
  
  renderLeaderboard(currentRunners);
  
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-sort="${sortType}"]`).classList.add('active');
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('raceSection').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('activityModal').classList.add('hidden');
});

document.getElementById('activityModal').addEventListener('click', (e) => {
  if (e.target.id === 'activityModal') {
    document.getElementById('activityModal').classList.add('hidden');
  }
});

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sortLeaderboard(btn.dataset.sort);
  });
});

const style = document.createElement('style');
style.textContent = `
  .sort-btn {
    background: white;
    color: #64748b;
  }
  .sort-btn.active {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
  }
`;
document.head.appendChild(style);

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================
window.loadRace = loadRace;
window.showActivities = showActivities;

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

init();