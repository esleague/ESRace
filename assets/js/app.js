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
  EVENTS.forEach(event => {
    const btn = document.createElement("button");
    btn.textContent = event.name;
    btn.className =
      "px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700";
    btn.onclick = () => loadEvent(event);
    eventListEl.appendChild(btn);
  });
}

async function loadEvent(event) {
  eventTitleEl.textContent = event.name;
  leaderboardEl.innerHTML = "⏳ Loading...";

  try {
    // Fetch all users IN PARALLEL
    const results = await Promise.all(
      event.members.map(id => fetchUserRaceStat(id))
    );

    const runners = [];

    results.forEach(userData => {
      const raceData = userData[event.raceId];
      if (!raceData || !raceData.statistic_user) return;

      const u = raceData.statistic_user;

      runners.push({
        name: u.user_name,
        avatar: u.avatar,
        totalKm: Number(u.total_km_achieve),
        ranking: u.ranking,
        pace: u.avg_pace
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
  if (runners.length === 0) {
    leaderboardEl.innerHTML = "No data";
    return;
  }

  leaderboardEl.innerHTML = runners.map((r, i) => `
    <div class="bg-white rounded shadow p-4 flex items-center gap-4">
      <div class="font-bold text-xl w-8">${i + 1}</div>

      <img src="${r.avatar}" class="w-12 h-12 rounded-full">

      <div class="flex-1">
        <div class="font-semibold">${r.name}</div>
        <div class="text-sm text-gray-500">
          Global rank: #${r.ranking || "-"}
        </div>
      </div>

      <div class="font-bold text-lg">
        ${r.totalKm.toFixed(2)} km
      </div>
    </div>
  `).join("");
}

// Init
renderEvents();
