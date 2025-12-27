let currentRunners = [];
let currentHelpers = null;
let currentSort = "distance";


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

  currentSort = type;

  switch (type) {
    case "distance":
      currentRunners.sort((a, b) => b.totalKm - a.totalKm);
      break;

    case "time":
      currentRunners.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);
      break;

    case "pace":
      currentRunners.sort((a, b) => a.paceSeconds - b.paceSeconds);
      break;
  }

  renderLeaderboard(currentRunners, currentHelpers);
}


function formatTotalTime(seconds) {
  if (!seconds || seconds <= 0) return "-";

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

function formatAvgPace(paceSeconds) {
  if (!paceSeconds || !isFinite(paceSeconds)) return "-";
  const m = Math.floor(paceSeconds / 60);
  const s = paceSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

// 🥇🥈🥉 Rank highlight helpers
function getRankStyle(index) {
  if (index === 0) {
    return "bg-amber-50 border-amber-300 text-amber-700";
  }
  if (index === 1) {
    return "bg-slate-100 border-slate-300 text-slate-700";
  }
  if (index === 2) {
    return "bg-orange-50 border-orange-300 text-orange-700";
  }
  return "bg-white border-slate-200 text-slate-800";
}

function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "";
}


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

function createSkeletonRow() {
  const el = document.createElement("div");
  el.className =
    "bg-white rounded shadow p-4 flex items-center gap-4 animate-pulse";

  el.innerHTML = `
    <div class="w-8 h-6 bg-gray-200 rounded"></div>

    <div class="w-12 h-12 bg-gray-200 rounded-full"></div>

    <div class="flex-1 space-y-2">
      <div class="h-4 bg-gray-200 rounded w-1/3"></div>
      <div class="h-3 bg-gray-100 rounded w-1/4"></div>
    </div>

    <div class="h-5 bg-gray-200 rounded w-16"></div>
  `;

  return el;
}


function updateAvatar(myvneId, avatarUrl) {
  const imgs = document.querySelectorAll(
    `img[data-user-id="${myvneId}"]`
  );
  imgs.forEach(img => (img.src = avatarUrl));
}


async function enrichRunnersInBackground(runners, raceId) {
  // limit concurrency
  const pool = [];

  for (const r of runners) {
    pool.push((async () => {
      // Avatar
      try {
        r.avatar = sanitizeURL(await getUserAvatar(r.myvne_id));
        updateAvatar(r.myvne_id, r.avatar);
      } catch {}

      // Activities
      try {
        const stats = await fetchUserActivities(r.myvne_id, raceId);
        r.stats = stats;
        r.statsHtml = renderStatisticsTable(stats);

        let totalTime = 0;
        let totalDistance = 0;

        stats.forEach(a => {
          totalTime += Number(a.elapsed_time || 0);
          totalDistance += Number(a.distance || 0);
        });

        r.totalTimeSeconds = totalTime;
        r.paceSeconds =
          totalDistance > 0
            ? Math.round(totalTime / (totalDistance / 1000))
            : Infinity;

      } catch {}
    })());

    // throttle
    if (pool.length >= 5) {
      await Promise.race(pool);
      pool.splice(0, pool.length - 4);
    }
  }
}
function statisticsSkeleton() {
  return `
    <div class="animate-pulse space-y-3 p-4">
      ${Array.from({ length: 3 })
        .map(
          () => `
          <div class="grid grid-cols-4 gap-2">
            <div class="h-3 bg-gray-200 rounded"></div>
            <div class="h-3 bg-gray-200 rounded"></div>
            <div class="h-3 bg-gray-200 rounded"></div>
            <div class="h-3 bg-gray-200 rounded"></div>
          </div>`
        )
        .join("")}
    </div>
  `;
}

function updateEventStats(runners) {
  const totalKmAll = runners.reduce((s, r) => s + (r.totalKm || 0), 0);
  const activeUsers = runners.filter(r => r.totalKm > 0).length;

  document.getElementById("eventStats").innerHTML = `
    <div>
      <span class="font-semibold text-gray-700">🏁 Tổng quãng đường:</span>
      <span class="font-semibold">${totalKmAll.toFixed(2)} km</span>
    </div>
    <div>
      <span class="font-semibold text-gray-700">🏃 Số người đã chạy:</span>
      <span class="font-semibold">${activeUsers}</span>
    </div>
  `;
}


async function loadEvent(event) {
  eventTitleEl.textContent = event.name;
  leaderboardEl.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    leaderboardEl.appendChild(createSkeletonRow());
  }

  try {
    // ---------- PHASE 1: fetch race stats (FAST) ----------
    const allUsers = [...event.members, ...(event.whitelist || [])];

    const results = await Promise.allSettled(
      allUsers.map(id => fetchUserRaceStat(id))
    );

    const runners = [];

    for (const r of results) {
      if (r.status !== "fulfilled") continue;

      const raceData = r.value[event.raceId];
      if (!raceData?.statistic_user) continue;

      const u = raceData.statistic_user;
      const isWhitelisted = event.whitelist?.includes(raceData.myvne_id);

      runners.push({
        name: DOMPurify.sanitize(u.user_name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
        avatar: "", // placeholder
        totalKm: Number(u.total_km_achieve || 0),
        ranking: u.ranking,
        pace: u.avg_pace,
        myvne_id: raceData.myvne_id,
        isCompetitive: !isWhitelisted,

        // stats filled later
        totalTimeSeconds: 0,
        paceSeconds: Infinity,
        stats: null,
        statsHtml: null
      });
    }

    // ---------- PHASE 2: render IMMEDIATELY ----------
    runners.sort((a, b) => b.totalKm - a.totalKm);

    currentRunners = runners;
    currentHelpers = { raceId: event.raceId };

    renderLeaderboard(runners, currentHelpers);

    // Event meta
    const raceInfo = await fetchRaceInfoByCode(event.raceCode);
    document.getElementById("eventDate").innerHTML =
      formatDateRange(raceInfo.fromTime, raceInfo.endTime);
    startCountdown(raceInfo.fromTime, raceInfo.endTime);

    // Event statistics (instant)
    updateEventStats(runners);

    // ---------- PHASE 3: background enrichment ----------
    enrichRunnersInBackground(runners, event.raceId);

  } catch (err) {
    console.error(err);
    leaderboardEl.innerHTML = "❌ Failed to load data";
  }
}


function renderLeaderboard(runners, helpers) {
  leaderboardEl.innerHTML = "";
  if (!runners || runners.length === 0) {
    leaderboardEl.textContent = "No data";
    return;
  }

  leaderboardEl.innerHTML = "";

  runners.forEach((r, i) => {

    const index = i;
    // --- Wrapper for row + stats ---
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col mb-2";

    // --- Main row ---
    const row = document.createElement("div");
    // row.className = "bg-white rounded shadow p-4 flex items-center gap-4 relative";
    row.className = `
        flex items-center gap-3 px-4 py-3 mb-2
        border rounded-xl
        transition-all duration-300
        ${getRankStyle(index)}
      `;



    // Rank badge
    const rankEl = document.createElement("div");
    rankEl.className = "font-bold text-xl w-8 text-center";
    // rankEl.textContent = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
    rankEl.textContent = getMedal(index);

    // Avatar
    const avatar = document.createElement("img");
    avatar.alt = "";
    avatar.loading = "lazy";
    avatar.dataset.userId = r.myvne_id;
    avatar.src = r.avatar || "assets/images/running-duck.gif";
    avatar.className = "w-12 h-12 rounded-full bg-gray-200 transition-opacity opacity-0";
    avatar.onload = () => {
      avatar.classList.remove("opacity-0");
    };

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
    const metric = document.createElement("div");
    metric.className = "font-bold text-lg text-right min-w-[90px]";

    if (currentSort === "distance") {
      metric.textContent = `${r.totalKm.toFixed(2)} km`;
      metric.classList.add("text-slate-900");
    } 
    else if (currentSort === "time") {
      metric.textContent = formatTotalTime(r.totalTimeSeconds);
      metric.classList.add("text-indigo-600");
    } 
    else if (currentSort === "pace") {
      metric.textContent = formatAvgPace(r.paceSeconds);
      metric.classList.add("text-emerald-600");
    }

    row.appendChild(rankEl);
    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(metric);

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
            if (!r.statsHtml) {
        statContainer.innerHTML = statisticsSkeleton();
      } else {
        statContainer.innerHTML = r.statsHtml;
      }
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

document.querySelectorAll("#sortGroup .sort-btn").forEach(btn => {
  btn.onclick = () => {
    document
      .querySelectorAll("#sortGroup .sort-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    applySort(btn.dataset.sort);
  };
});
