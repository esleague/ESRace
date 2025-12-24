const BASE_API = "https://apivrace.vnexpress.net";

/**
 * Fetch race statistic for ONE user
 */
async function fetchUserRaceStat(myvneId) {
  const url = `${BASE_API}/user/profile-race` +
    `?myvne_id=${myvneId}` +
    `&type=1&offset=0&limit=6&action=1&lang=vi`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.code !== 200) {
    throw new Error("API error");
  }

  return json.data;
}

async function fetchRaceInfoByCode(raceCode) {
  const url = `${BASE_API}/race/detail?code_url=${raceCode}&select=statistic&lang=vi`;

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

