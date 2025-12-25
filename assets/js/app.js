const eventListEl = document.getElementById("eventList");
const leaderboardEl = document.getElementById("leaderboard");
const eventTitleEl = document.getElementById("eventTitle");


function formatDateRange(from, to) {
  const f = new Date(from);
  const t = new Date(to);

  const pad = n => n.toString().padStart(2, "0");

  return `Thời gian diễn ra: ${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()}
  - ${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()}`;
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

      countdownEl.textContent = `${label}: ${days} ngày ${hours} giờ ${minutes} phút`;

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
  console.log(event.whitelist);
  console.log(userId);
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
      ...event.members
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

    validResults.forEach(userData => {
      const raceData = userData[event.raceId];
      if (!raceData || !raceData.statistic_user) return;

      const u = raceData.statistic_user;
      runners.push({
        name: DOMPurify.sanitize(u.user_name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
        avatar: sanitizeURL(u.avatar),
        totalKm: Number(u.total_km_achieve),
        ranking: u.ranking,
        pace: u.avg_pace,
        isCompetitive: true
      });
    });

    const whitelistedUsers = [
      ...(event.whitelist || [])
    ];

    const whitelistedresults = await Promise.all(
      whitelistedUsers.map(async id => {
        try {
          return await fetchUserRaceStat(id);
        } catch (err) {
          console.error(`Failed to fetch stats for user ${id}:`, err);
          return null; 
        }
      })
    );
    const validwhitelistedresults = results.filter(r => r !== null);
    validwhitelistedresults.forEach(userData => {
      const raceData = userData[event.raceId];
      if (!raceData || !raceData.statistic_user) return;

      const u = raceData.statistic_user;
      runners.push({
        name: DOMPurify.sanitize(u.user_name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
        avatar: sanitizeURL(u.avatar),
        totalKm: Number(u.total_km_achieve),
        ranking: u.ranking,
        pace: u.avg_pace,
        isCompetitive: false
      });
    });

    // Sort by distance DESC
    runners.sort((a, b) => b.totalKm - a.totalKm);

    const raceInfo = await fetchRaceInfoByCode(event.raceCode);

    document.getElementById("eventDate").textContent =
      formatDateRange(raceInfo.fromTime, raceInfo.endTime);

    startCountdown(raceInfo.fromTime, raceInfo.endTime);



    renderLeaderboard(runners);

  } catch (err) {
    console.error(err);
    leaderboardEl.innerHTML = "❌ Failed to load data";
  }
}

function renderLeaderboard(runners) {
  if (!runners || runners.length === 0) {
    leaderboardEl.textContent = "No data";
    return;
  }

  leaderboardEl.innerHTML = "";

  runners.forEach((r, i) => {
    const rank = i + 1;

    const row = document.createElement("div");
    row.className =
      "bg-white rounded shadow p-4 flex items-center gap-4";

    if (rank === 1) row.classList.add("ring-2", "ring-yellow-400");
    if (rank === 2) row.classList.add("ring-2", "ring-gray-400");
    if (rank === 3) row.classList.add("ring-2", "ring-orange-400");

    /* Rank badge */
    const rankEl = document.createElement("div");
    rankEl.className = "font-bold text-xl w-8 text-center";

    if (rank === 1) rankEl.textContent = "🥇";
    else if (rank === 2) rankEl.textContent = "🥈";
    else if (rank === 3) rankEl.textContent = "🥉";
    else rankEl.textContent = rank;

    /* Avatar */
    const avatar = document.createElement("img");
    avatar.src = r.avatar;
    avatar.alt = "";
    avatar.className = "w-12 h-12 rounded-full";
    avatar.loading = "lazy";

    /* Name + whitelist icon + global rank */
    const info = document.createElement("div");
    info.className = "flex-1";

    const nameRow = document.createElement("div");
    nameRow.className = "font-semibold flex items-center gap-1";

    const nameEl = document.createElement("span");
    nameEl.textContent = r.name;

    nameRow.appendChild(nameEl);
    
    // 🛡️ Whitelist indicator
    if (r.isCompetitive === false) {
      const shield = document.createElement("span");
      shield.textContent = "🛡️";
      shield.title = "Không tính giải";
      shield.className = "text-blue-500";
      nameRow.appendChild(shield);
    }

    const globalRank = document.createElement("div");
    globalRank.className = "text-sm text-gray-500";
    globalRank.textContent =
      `Global rank: #${r.ranking || "-"}`;

    info.appendChild(nameRow);
    info.appendChild(globalRank);

    /* Distance */
    const km = document.createElement("div");
    km.className = "font-bold text-lg";
    km.textContent = `${r.totalKm.toFixed(2)} km`;

    row.appendChild(rankEl);
    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(km);

    leaderboardEl.appendChild(row);
  });
}



// Init
renderEvents();
