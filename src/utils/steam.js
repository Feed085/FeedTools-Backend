const axios = require('axios');

/**
 * Resolves a Steam ID from a profile URL or directly returns it.
 * @param {string} profileUrl - The Steam profile URL (e.g., https://steamcommunity.com/id/customname/ or https://steamcommunity.com/profiles/76561198054366123/)
 * @returns {Promise<string>} - The resolved SteamID64 or null.
 */
const resolveSteamID = async (profileUrl) => {
    if (!profileUrl) return null;

    // SteamID64 is a 17-digit number starting with 7
    const steamID64Regex = /7656119\d{10}/;
    const match = profileUrl.match(steamID64Regex);
    if (match) return match[0];

    // If it's a custom URL (e.g., .../id/customname)
    const customURLMatch = profileUrl.match(/\/id\/([^\/]+)/);
    if (customURLMatch) {
        const vanityURL = customURLMatch[1];
        const res = await axios.get(`http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/`, {
            params: {
                key: process.env.STEAM_API_KEY,
                vanityurl: vanityURL
            }
        });

        if (res.data.response && res.data.response.success === 1) {
            return res.data.response.steamid;
        }
    }

    return null;
};

/**
 * Fetches steam profile information (specifically visibility).
 * @param {string} steamID - The 17-digit SteamID.
 * @returns {Promise<Object>} - The profile data.
 */
const getSteamProfile = async (steamID) => {
    const res = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`, {
        params: {
            key: process.env.STEAM_API_KEY,
            steamids: steamID
        }
    });

    if (res.data.response && res.data.response.players.length > 0) {
        return res.data.response.players[0];
    }
    return null;
};

/**
 * Fetches games and playtime for a SteamID.
 * @param {string} steamID - The 17-digit SteamID.
 * @returns {Promise<Object>} - { totalGames, totalPlaytime, isPrivate }
 */
const getSteamData = async (steamID) => {
    try {
        const profile = await getSteamProfile(steamID);
        if (!profile) return { totalGames: 0, totalPlaytime: 0, isPrivate: false };

        // communityvisibilitystate 3 means public
        if (profile.communityvisibilitystate !== 3) {
            return { totalGames: 0, totalPlaytime: 0, isPrivate: true };
        }

        const gamesRes = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`, {
            params: {
                key: process.env.STEAM_API_KEY,
                steamid: steamID,
                include_appinfo: true,
                format: 'json'
            }
        });

        const games = gamesRes.data.response.games || [];
        const totalGames = gamesRes.data.response.game_count || 0;
        const totalPlaytimeMinutes = games.reduce((acc, game) => acc + (game.playtime_forever || 0), 0);
        const totalPlaytimeHours = Math.round(totalPlaytimeMinutes / 60);

        // Fetch achievements for top 10 most played games (API doesn't have a global total)
        // We do this for a subset to avoid excessive API calls and timeouts
        let totalAchievements = 0;
        const topGames = games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 10);

        for (const game of topGames) {
            try {
                const statsRes = await axios.get(`http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/`, {
                    params: {
                        key: process.env.STEAM_API_KEY,
                        steamid: steamID,
                        appid: game.appid
                    },
                    timeout: 2000 // Short timeout per game
                });

                if (statsRes.data.playerstats && statsRes.data.playerstats.achievements) {
                    const unlockedCount = statsRes.data.playerstats.achievements.filter(a => a.achieved === 1).length;
                    totalAchievements += unlockedCount;
                }
            } catch (err) {
                // Ignore errors for individual games (some may fail/be disallowed)
                continue;
            }
        }

        return {
            totalGames,
            totalPlaytime: totalPlaytimeHours,
            totalAchievements,
            isPrivate: false
        };
    } catch (error) {
        console.error('Error fetching data from Steam:', error.message);
        throw error;
    }
};

module.exports = {
    resolveSteamID,
    getSteamData
};
