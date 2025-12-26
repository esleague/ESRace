const BASE_API = "https://apivrace.vnexpress.net";

/**
 * Fetch race statistic for ONE user
 */
async function fetchUserRaceStat(myvneId) {
  const url = `${BASE_API}/user/profile-race` +
    `?myvne_id=${myvneId}` +
    `&type=1&offset=0&limit=6&action=1&lang=vi&_=${Date.now()}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.code !== 200) {
    throw new Error("API error");
  }

  const resultWithId = {};
  for (const [raceId, raceData] of Object.entries(json.data)) {
    resultWithId[raceId] = { ...raceData, myvne_id: myvneId };
  }
  return resultWithId;
}

async function fetchUserActivities(myvneId, raceId) {
  const res = await fetch(
    `${BASE_API}/user/get-result-activity?myvne_id=${myvneId}&race_id=${raceId}&_=${Date.now()}`
  );
  const json = await res.json();

  if (json.code !== 200 || !Array.isArray(json.data)) {
    return [];
  }
  return json.data;
}

async function fetchRaceInfoByCode(raceCode) {
  const url = `${BASE_API}/race/detail?code_url=${raceCode}&select=statistic&lang=vi&_=${Date.now()}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.code !== 200 || !json.data) {
    throw new Error("Failed to fetch race info");
  }

  // data is keyed by raceId (e.g. "309")
  const raceId = Object.keys(json.data)[0];
  const race = json.data[raceId];

  if (!race || !race.race_time) {
    throw new Error("Race time not found in API response");
  }

  return {
    name: race.name,
    fromTime: race.race_time.from_time * 1000,
    endTime: race.race_time.to_time * 1000
  };
}
