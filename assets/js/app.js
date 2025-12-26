let currentRunners = [];
let currentHelpers = null;


const eventListEl = document.getElementById("eventList");
const leaderboardEl = document.getElementById("leaderboard");
const eventTitleEl = document.getElementById("eventTitle");

const userDetailCache = new Map();

async function getUserAvatar(myvneId) {
  if (userDetailCache.has(myvneId)) {
    return userDetailCache.get(myvneId);
  }

  try {
    const res = await fetch(
      `${BASE_API}/user/detail?myvne_id=${myvneId}`
    );
    const json = await res.json();

    const avatar =
      json?.code === 200 &&
      json?.data?.[myvneId]?.avatar
        ? json.data[myvneId].avatar
        : "";

    userDetailCache.set(myvneId, avatar);
    return avatar;
  } catch (e) {
    console.error("Avatar fetch failed:", myvneId, e);
    return "";
  }
}

function paceToSeconds(pace) {
  if (!pace) return Infinity;
  const [m, s] = pace.split(":").map(Number);
  return m * 60 + s;
}

function timeStringToSeconds(str) {
  // format: 101'43'' or 58'13''
  if (!str) return 0;
  const match = str.match(/(\d+)'(\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function applySort(type) {
  if (!currentRunners.length) return;

  const sorted = [...currentRunners];

  switch (type) {
    case "distance":
      sorted.sort((a, b) => b.totalKm - a.totalKm);
      break;

    case "time":
      // MOST TIME first
      sorted.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);
      break;

    case "pace":
      // FASTEST first (smaller pace = faster)
      sorted.sort((a, b) => a.paceSeconds - b.paceSeconds);
      break;
  }

  renderLeaderboard(sorted, currentHelpers);
}document.getElementById("sortSelect").addEventListener("change", (e) => {
  applySort(e.target.value);
});



function formatDateRange(from, to) {
  const f = new Date(from);
  const t = new Date(to);

  const pad = n => n.toString().padStart(2, "0");

  return `<div>
        <span class="font-semibold text-gray-700">📅 Thời gian diễn ra:</span>
        <span class="font-semibold">
          ${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()}
  - ${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()}
        </span>
      </div>`;
}


function startCountdown(fromTime, endTime) {
  const countdownEl = document.getElementById("countdown");

  if (!countdownEl) return;

  function tick() {
    const now = Date.now();

    let diff;
    let label;

    if (now < fromTime) {
      diff = fromTime - now;
      label = "Bắt đầu sau";
    } else if (now < endTime) {
      diff = endTime - now;
      label = "Còn lại";
    } else {
      countdownEl.textContent = "⏱ Đã kết thúc";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const pad = n => n.toString().padStart(2, "0");

      countdownEl.innerHTML = `<div>
        <span class="font-semibold text-gray-700">⏳ ${label}:</span>
        <span class="font-semibold">
          ${days} ngày ${hours} giờ ${minutes} phút
        </span>
      </div>`;

  }

  tick();
  setInterval(tick, 60 * 1000); // update every minute
}


function renderEvents() {
  const EVENTS = window.RACE_CONFIGS;
  EVENTS.forEach(event => {
    const btn = document.createElement("button");
    btn.textContent = event.name;
    btn.className =
      "px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700";
    btn.onclick = () => loadEvent(event);
    eventListEl.appendChild(btn);
  });
}

function isUserWhitelisted(event, userId) {
  if (!event || !Array.isArray(event.whitelist)) return false;

  const uid = String(userId).trim();

  for (let i = 0; i < event.whitelist.length; i++) {
    const wid = String(event.whitelist[i]).trim();
    if (wid === uid) {
      return true;
    }
  }
  return false;
}

async function loadEvent(event) {
  eventTitleEl.textContent = event.name;
  leaderboardEl.innerHTML = "⏳ Loading...";

  try {
    // Fetch all users IN PARALLEL
    const allUsers = [
      ...event.members,
      ...(event.whitelist || [])
    ];

    const results = await Promise.all(
      allUsers.map(async id => {
        try {
          return await fetchUserRaceStat(id);
        } catch (err) {
          console.error(`Failed to fetch stats for user ${id}:`, err);
          return null; 
        }
      })
    );

    const validResults = results.filter(r => r !== null);
    const runners = [];

    for (const userData of validResults) {
      const raceData = userData[event.raceId];
      if (!raceData || !raceData.statistic_user) return;

      const u = raceData.statistic_user;
      const isWhitelisted = event.whitelist?.includes(raceData.myvne_id);
      let avatarR = "";
      try {
        avatarR = await getUserAvatar(raceData.myvne_id);
      } catch (e) {
        console.error("Avatar fetch failed:", u.myvne_id);
      }

      const stats = await fetchUserActivities(raceData.myvne_id, event.raceId);

      // Calculate totals from activity API
      let totalTimeSeconds = 0;
      let totalDistance = 0;

      stats.forEach(a => {
        totalTimeSeconds += Number(a.elapsed_time || 0);
        totalDistance += Number(a.distance || 0);
      });

      const paceSeconds =
        totalDistance > 0
          ? Math.round(totalTimeSeconds / (totalDistance / 1000))
          : Infinity;

      runners.push({
        name: DOMPurify.sanitize(u.user_name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
        avatar: sanitizeURL(avatarR),
        totalKm: Number(u.total_km_achieve),
        ranking: u.ranking,
        pace: u.avg_pace,
        myvne_id: raceData.myvne_id,
        isCompetitive: !isWhitelisted,
        totalTimeSeconds,
        paceSeconds,
        stats,
        statsHtml: renderStatisticsTable(stats)
      });
    };

    // Sort by distance DESC
    runners.sort((a, b) => b.totalKm - a.totalKm);

    const raceInfo = await fetchRaceInfoByCode(event.raceCode);

    document.getElementById("eventDate").innerHTML =
      formatDateRange(raceInfo.fromTime, raceInfo.endTime);

    startCountdown(raceInfo.fromTime, raceInfo.endTime);



    var helpers = {
      raceId: event.raceId
    };
    currentRunners = runners;
    currentHelpers = helpers;

    applySort("distance"); // default
    const sortSelect = document.getElementById("sortSelect");

    sortSelect.onchange = () => {
      applySort(sortSelect.value);
    };

    const totalKmAll = runners.reduce(
      (sum, r) => sum + (r.totalKm || 0),
      0
    );

    const activeUsers = runners.filter(r => r.totalKm > 0).length;
    const eventStatsEl = document.getElementById("eventStats");

    eventStatsEl.innerHTML = `
      <div>
        <span class="font-semibold text-gray-700">🏁 Tổng quãng đường:</span>
        <span class="font-semibold">
          ${totalKmAll.toFixed(2)} km
        </span>
      </div>
      <div>
        <span class="font-semibold text-gray-700">🏃 Số người đã chạy:</span>
        <span class="font-semibold">
          ${activeUsers}
        </span>
      </div>
    `;

  } catch (err) {
    console.error(err);
    leaderboardEl.innerHTML = "❌ Failed to load data";
  }
}

function renderLeaderboard(runners, helpers) {
  if (!runners || runners.length === 0) {
    leaderboardEl.textContent = "No data";
    return;
  }

  leaderboardEl.innerHTML = "";

  runners.forEach((r, i) => {
    const rank = i + 1;

    // --- Wrapper for row + stats ---
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col mb-2";

    // --- Main row ---
    const row = document.createElement("div");
    row.className = "bg-white rounded shadow p-4 flex items-center gap-4 relative";

    if (rank === 1) row.classList.add("ring-2", "ring-yellow-400");
    if (rank === 2) row.classList.add("ring-2", "ring-gray-400");
    if (rank === 3) row.classList.add("ring-2", "ring-orange-400");

    // Rank badge
    const rankEl = document.createElement("div");
    rankEl.className = "font-bold text-xl w-8 text-center";
    rankEl.textContent = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;

    // Avatar
    const avatar = document.createElement("img");
    avatar.src = r.avatar;
    avatar.alt = "";
    avatar.className = "w-12 h-12 rounded-full";
    avatar.loading = "lazy";

    // Name + whitelist icon + global rank
    const info = document.createElement("div");
    info.className = "flex-1";

    const nameRow = document.createElement("div");
    nameRow.className = "font-semibold flex items-center gap-1";

    const nameEl = document.createElement("div");
    nameEl.className = "font-semibold";
    nameEl.textContent = r.name;

    // 🛡️ Whitelist indicator
    if (r.isCompetitive === false) {
      const shield = document.createElement("span");
      shield.textContent = " 🛡️";
      shield.title = "Không tính giải";
      shield.className = "text-blue-500";
      nameEl.appendChild(shield);
    }

    const globalRank = document.createElement("div");
    globalRank.className = "text-sm text-gray-500";
    globalRank.textContent = `Global rank: #${r.ranking || "-"}`;

    info.appendChild(nameEl);
    info.appendChild(globalRank);

    // Distance
    const km = document.createElement("div");
    km.className = "font-bold text-lg";
    km.textContent = `${r.totalKm.toFixed(2)} km`;

    row.appendChild(rankEl);
    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(km);

    // --- Statistics toggle ---
    const statBtn = document.createElement("div");
    statBtn.textContent = "Bảng thống kê";
    statBtn.className = "font-bold text-blue-500 cursor-pointer mt-2 text-xs";
    statBtn.style.userSelect = "none";

    // Container for statistics
    const statContainer = document.createElement("div");
    statContainer.className = "mt-2 p-2 bg-gray-50 rounded shadow hidden";
    statContainer.style.maxHeight = "0";
    statContainer.style.overflow = "hidden";
    statContainer.style.transition = "max-height 0.3s ease";

    statBtn.addEventListener("click", () => {
      if (!statContainer.dataset.loaded) {
        statContainer.innerHTML =
          r.statsHtml ||
          "<div class='text-gray-500 text-center'>Không có dữ liệu</div>";
        statContainer.dataset.loaded = "true";
      }

      if (statContainer.classList.contains("hidden")) {
        statContainer.classList.remove("hidden");
        statContainer.style.maxHeight = statContainer.scrollHeight + "px";
      } else {
        statContainer.style.maxHeight = "0";
        setTimeout(() => statContainer.classList.add("hidden"), 300);
      }
    });

    info.appendChild(statBtn);

    // Structure
    wrapper.appendChild(row);
    wrapper.appendChild(statContainer);

    // Add wrapper to leaderboard
    leaderboardEl.appendChild(wrapper);
  });
}

// Helper function to render the statistics table
function renderStatisticsTable(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return `<div class="text-sm text-gray-500 text-center py-4">Không có dữ liệu</div>`;
  }

  const rows = data.map(item => {
    const start = formatStartTime(item.start_date);
    const time = formatDuration(item.elapsed_time);
    const pace = formatPace(item.elapsed_time, item.distance);
    const km = (item.distance / 1000).toFixed(2);

    return `
      <div class="grid grid-cols-4 items-center px-4 py-3">
        <div class="text-left text-sm text-gray-600">${start}</div>
        <div class="text-center text-gray-600">${time}</div>
        <div class="text-center text-gray-600">${pace}</div>
        <div class="text-center text-gray-600">${km}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="rounded-xl bg-slate-50 overflow-hidden">
      <!-- Header -->
      <div class="grid grid-cols-4 px-4 py-3 text-sm font-semibold text-gray-700 bg-white">
        <div class="text-left">Start</div>
        <div class="text-center">Time</div>
        <div class="text-center">Min/km</div>
        <div class="text-center">Km</div>
      </div>

      <!-- Rows -->
      <div class="divide-y divide-slate-200 [&>div]:hover:bg-white transition">
        ${rows}
      </div>
    </div>
  `;
}


// Helpers
function pad(n) {
  return n.toString().padStart(2, "0");
}

function formatDateTime(ts) {
  const date = new Date(ts * 1000);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}, ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
}

function formatStartTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDuration(seconds) {
  seconds = Math.round(seconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}'${s.toString().padStart(2, "0")}''`;
}

function formatPace(seconds, distance) {
  if (!distance) return "-";
  const pace = seconds / (distance / 1000);
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}



// Init
renderEvents();

document.getElementById("sortSelect").addEventListener("change", (e) => {
  applySort(e.target.value);
});
