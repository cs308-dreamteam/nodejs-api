
const express = require('express');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const app = express();
const bodyParser = require('body-parser');
const connection = require('./database');
const {EMAIL, PASSWORD} = require('./env.js');
const Mailgen = require('mailgen');
const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY;
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const nodemailer = require('nodemailer');
var SpotifyWebApi = require('spotify-web-api-node');

const verifyToken = (req, res, next) => {
    const token =
      req.body.token || req.query.token || req.headers["x-access-token"];
  
    if (!token) {
      return res.status(403).send("A token is required for authentication");
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
          return res.status(401).send("Invalid token");
        }
        req.name = decoded; // Attach the decoded user information to the request object
        return next();
      
    });
};


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  
var spotifyApi = new SpotifyWebApi({
    clientId: process.env.SWA_CLIENT_ID,
    clientSecret: process.env.SWA_CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/callback'
});

let spoToken = process.env.SPO_TOKEN;
let refToken = process.env.REF_TOKEN;

const userId = "";
const getMe = () => {
    spotifyApi.getMe()
        .then(function (data) {
            console.log(data.body);
            return data.body.id;
        }, function (err) {
            console.log(err);
        });
    
}
const getPlayList = async () => {
    const id = await getMe();
    const data = await spotifyApi.getUserPlaylists(id);
    console.log(data);
    return data;
} 

app.use('/spotifyGetPlaylist', (req, res) => {
    const data = getPlayList();
    res.status(200).json({message: data});
}); 

app.use('/spotifyAuthorize', (req, res, next) => {
    res.redirect(spotifyApi.createAuthorizeURL([
        "ugc-image-upload", //
        "user-read-playback-state", //
        "user-modify-playback-state", //
        "user-read-currently-playing", //
        "app-remote-control", //
        "streaming",//
        "playlist-read-private", //
        "playlist-read-collaborative", //
        "playlist-modify-private", //
        "user-follow-modify", //
        "user-follow-read", //
        "user-read-playback-position", //
        "user-top-read", //
        "user-library-modify", //
        "user-library-read", //
        "user-read-email",//
        "user-read-private", //
    ]))
    next();
})

app.use('/callback', async (req, res, next) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    spoToken = data.body['access_token'];
    refToken = data.body['refresh_token'];

    // Set tokens in your SpotifyWebApi instance
    spotifyApi.setAccessToken(spoToken);
    spotifyApi.setRefreshToken(refToken);

    console.log('Access Token:', spoToken);
    console.log('Refresh Token:', refToken);

    res.status(200).json( {message: "Success"} );

  } catch (err) {
    console.error(err);
    
  }
});

    
function isStrongPassword(password, email) {
    
    const lengthRegex = /.{8,}/; 
    const uppercaseRegex = /[A-Z]/; 
    const lowercaseRegex = /[a-z]/; 
    const numberRegex = /[0-9]/; 
    
    const hasValidLength = lengthRegex.test(password);
    const hasUppercase = uppercaseRegex.test(password);
    const hasLowercase = lowercaseRegex.test(password);
    const hasNumber = numberRegex.test(password);
    

    
    const strengthScore = [hasValidLength, hasUppercase, hasLowercase, hasNumber]
        .filter(Boolean)
        .length;

    
    const minimumStrength = 2; 

    
    return strengthScore >= minimumStrength;
}

function isEmail(mail) {
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;

    return emailRegex.test(mail);
}
function checkUsername(username) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM users WHERE username = ?';
        connection.query(sql, [username], (error, result) => {
            if (error) {
                reject(error);
            } else {
                const usernameExists = result.length > 0;
                resolve(usernameExists);
            }
        });
    });
}

function insertData(username, password, email) {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        connection.query(sql, [username, password, email], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.insertId);
            }
        });
    });
}
function checkPass(name, pass) {
    return new Promise((resolve,reject) => {
        const sql = 'SELECT COUNT(*) as count FROM users u WHERE u.username = ? AND u.password = ?';
        connection.query(sql, [name, pass], (error, results) => {
            if (error) {
                reject(error);
            }
            else {
                if (results[0].count === 1) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            }
        })
    })
    
}

async function verifyUser(email) {
    return new Promise((resolve, reject) => {
      const updateQuery = "UPDATE users SET verified = 1 WHERE email = ?";
  
      connection.query(updateQuery, [email], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
}

app.use(bodyParser.json());
var querystring = require('querystring');
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };
var client_id = process.env.CLIENT_ID;
var redirect_uri = 'http://localhost:3000/';

app.get('/loginSpotify', function(req, res) {

  var state = generateRandomString(16);
  var scope = 'user-read-private user-read-email';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});


app.delete('/delete_song', verifyToken, async (req, res) => {
    const { title } = req.body;
    console.log('Received data:', title);
    const sqlDelete = 'DELETE userListens FROM userListens JOIN songs ON userListens.song = songs.song WHERE songs.songTitle = ? AND userListens.username = ?;';
    connection.query(sqlDelete, [title, req.name.username], (error, result) => {
        if (error) {
            return res.status(401).json( {message: 'No relation could be found'} );
        }
    });
});

app.get('/get_user', verifyToken, async (req, res) =>
{
    const { username } = req.name;
    const sql2 = 'SELECT path from user_pp where username = ?;'
    let path = '';
    let imageBase64 = '';
    connection.query(sql2, [username], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot get the pp' });
        }
        else {
            if(result[0] && result[0].path)
                imageBase64 = fs.readFileSync(result[0].path, 'base64');
        }
    })



    const sql  = 'SELECT username, email FROM users WHERE username = ?;';

    connection.query(sql, [username], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot get the user' });
        }
        else {
            return res.status(201).json( {
                username: result[0].username,
                mail: result[0].email,
                avatarPath: path,
                avatarBase64: imageBase64,
            });
        }
    })


})

const fs = require('fs');
const path = require('path');

const uploadsDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory);
}
app.post('/upload_image', verifyToken, async (req, res) => {
    const { username } = req.name;
    const { image } = req.body;
    // Decode the Base64 image string
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save the image to a file (optional)
    const fileName = `uploads/${username}_avatar.jpg`;
    fs.writeFileSync(fileName, buffer, 'base64');

    // Save or update the Base64 image in the database
    const insertOrUpdateSql = `
    INSERT INTO user_pp (username, path)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE path = VALUES(path)
    `;

    connection.query(insertOrUpdateSql, [username, fileName], (err) => {
    if (err) {
        console.error('Error saving image to MySQL:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        console.log('Image saved to MySQL');
        res.status(200).json({ message: 'Image uploaded successfully' });
    }
    });
});


async function searchSpotify(trackTitle, albumName, artistName) {
    const clientId = process.env.SWA_CLIENT_ID_MAIN;
    const clientSecret = process.env.SWA_CLIENT_SECRET_MAIN;

    // Encode client ID and client secret
    const authBuffer = Buffer.from(`${clientId}:${clientSecret}`);
    const base64Auth = authBuffer.toString('base64');

    try {
        // Get an access token
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64Auth}`
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Formulate the search query
        const query = encodeURIComponent(`track:${trackTitle} album:${albumName} artist:${artistName}`);

        // Search Spotify
        const searchResponse = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=track`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Process the search results
        console.log(searchResponse.data.tracks.items[0]);
        return searchResponse.data.tracks.items[0];

    } catch (error) {
        console.error('Error:', error.response.data);
    }
}

async function getAudioFeatures(trackId) {
    const clientId = process.env.SWA_CLIENT_ID_MAIN;
    const clientSecret = process.env.SWA_CLIENT_SECRET_MAIN;

    // Encode client ID and client secret
    const authBuffer = Buffer.from(`${clientId}:${clientSecret}`);
    const base64Auth = authBuffer.toString('base64');

    try {
        // Get an access token
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64Auth}`
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Request audio features
        const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Process the response
        console.log(featuresResponse.data);
        return featuresResponse.data
    } catch (error) {
        console.error('Error:', error.response.data);
    }
}

const mysql2 = require('mysql2/promise');

app.post('/add_song', verifyToken, async (req, res) => {
  const { songList } = req.body;
  console.log('Received data:', songList);
  const connection2 = await mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PW,
    database: 'db',
});
  try {
      await connection2.beginTransaction();
      for (const song of songList) {
          const checkSongSql = `SELECT s.song FROM songs s JOIN songArtist sa ON s.song = sa.song WHERE s.songTitle = ? AND sa.artist = ?;`;
          const [existingSongs] = await connection2.query(checkSongSql, [song.title, song.artists[0]]); // assuming the first artist in the array is the main artist

          if (existingSongs.length > 0) {
            console.log(`Song '${song.title}' by '${song.artists[0]}' already exists.`);
            const songID = existingSongs[0]["song"];
            const sqlUserListens = `INSERT IGNORE INTO userListens(song, username, rating) VALUES (\'${songID}\', \'${req.name.username}\', ${song.rating});`;
            await connection2.query(sqlUserListens);
            await connection2.query('UPDATE userListens ul SET ul.rating = ? WHERE ul.song = ? AND ul.username = ?', [song.rating, songID, req.name.username]);
            continue;
          }
          const songInfo = await searchSpotify(song.title, song.albums[0], song.artists[0]);
          console.log(songInfo["name"])
          console.log(songInfo["id"])
          const songId = songInfo["id"]
          const audioInfo = await getAudioFeatures(songId);
          console.log(audioInfo)

          const sqlSong = 'INSERT IGNORE INTO songs(songTitle, song) VALUES (?, ?);';
          await connection2.query(sqlSong, [songInfo["name"], songId]);

          for (const album of song.albums) {
            const sqlAlbum = 'INSERT IGNORE INTO songAlbum (song, album) VALUES (?, ?);';
            await connection2.query(sqlAlbum, [songId, album]);
          }

          for (const artist of song.artists) {
            const sqlArtist = 'INSERT IGNORE INTO songArtist (song, artist) VALUES (?, ?);';
            await connection2.query(sqlArtist, [songId, artist]);
          }

          for (const genre of song.genres) {
            const sqlGenre = 'INSERT IGNORE INTO songGenre (song, genre) VALUES (?, ?);';
            await connection2.query(sqlGenre, [songId, genre]);
          }
          const sqlSongFeatures = `INSERT IGNORE INTO songFeatures (song, danceability, energy, valence, popularity) VALUES (\'${songId}\', ${audioInfo["danceability"]}, ${audioInfo["energy"]}, ${audioInfo["valence"]}, ${songInfo["popularity"]});`;
          await connection2.query(sqlSongFeatures);

          const sqlUserListens = `INSERT IGNORE INTO userListens(song, username, rating) VALUES (\'${songId}\', \'${req.name.username}\', ${song.rating});`;
          console.log(req.name);
          await connection2.query(sqlUserListens);
      }

    await connection2.commit();
    res.status(200).json({ message: 'Data posted successfully' });
  } catch (err) {
      console.log(2);
      await connection2.rollback();
      res.status(500).json({ message: 'Error processing your request', error: err.message });
  } finally {
      await connection2.end();
  }
});

async function getArtistGenres(artistId, accessToken) {
    const url = `https://api.spotify.com/v1/artists/${artistId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.genres; // Array of genres
    } catch (error) {
        console.error('Error fetching artist genres:', error);
        return null;
    }
}

async function getRecommendationFromSpotify(spotifyIds) {
    const clientId = process.env.SWA_CLIENT_ID_MAIN;
    const clientSecret = process.env.SWA_CLIENT_SECRET_MAIN;

    // Encode client ID and client secret
    const authBuffer = Buffer.from(`${clientId}:${clientSecret}`);
    const base64Auth = authBuffer.toString('base64');

    try {
        // Get an access token
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64Auth}`
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Prepare seed values and attributes for the recommendation query
        const params = new URLSearchParams({
            limit: 30,
            seed_tracks: spotifyIds.join(','),
        });

        // Request recommendations
        const recommendationsResponse = await axios.get(`https://api.spotify.com/v1/recommendations?${params}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Map each track to a Promise that resolves to the formatted recommendation
        const recommendationsPromises = recommendationsResponse.data.tracks.map(async track => {
            const albumNames = track.album.name ? [track.album.name] : [];
            const artistNames = track.artists.map(artist => artist.name);
            const artistIDs = track.artists.map(artist => artist.id);
            const genres = await getArtistGenres(artistIDs[0], accessToken);

            return {
                song: track.name,
                artist: artistNames.join(", "),
                album: albumNames.join(", "),
                genre: genres.join(", "),
            };
        });

        // Wait for all Promises to resolve
        const formattedRecommendations = await Promise.all(recommendationsPromises);
        return formattedRecommendations;
    } catch (error) {
        console.error('Error:', error.message);
        return error.message;
    }
}

function calculateOptimumValues(tracks) {
    let totalWeights = 0;
    let weightedDanceability = 0;
    let weightedEnergy = 0;
    let weightedValence = 0;
    let weightedPopularity = 0;

    tracks.forEach(track => {
        totalWeights += track.rating;
        weightedDanceability += track.danceability * track.rating;
        weightedEnergy += track.energy * track.rating;
        weightedValence += track.valence * track.rating;
        weightedPopularity += track.popularity * track.rating;
    });

    return {
        danceability: weightedDanceability / totalWeights,
        energy: weightedEnergy / totalWeights,
        valence: weightedValence / totalWeights,
        popularity: weightedPopularity / totalWeights
    };
}

async function getaiSongs(username) {
    try {
        const sqlSong = 'SELECT distinct so.songTitle AS song, ul.rating, sf.danceability, sf.energy, sf.valence, sf.popularity FROM userListens ul JOIN songs so ON so.song = ul.song JOIN songfeatures sf on ul.song = sf.song WHERE ul.username = ?;';
        let songResults = await new Promise((resolve, reject) => {
            connection.query(sqlSong, [username], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        const formattedResult = songResults.map(track => ({
            ...track,
            rating: parseFloat(track.rating),
            danceability: parseFloat(track.danceability),
            energy: parseFloat(track.energy),
            valence: parseFloat(track.valence),
            popularity: parseInt(track.popularity, 10)
        }));
        const optimumValues = calculateOptimumValues(formattedResult);

        // Second Query
        const sqlRecom = 'SELECT \n' +
            '    s.song, \n' +
            '    s.songTitle \n' +
            'FROM \n' +
            '    songs s\n' +
            'JOIN \n' +
            '    songGenre sg ON s.song = sg.song\n' +
            'JOIN \n' +
            '    songfeatures sf ON s.song = sf.song\n' +
            'LEFT JOIN \n' +
            '    userListens ul ON s.song = ul.song\n' +
            'INNER JOIN \n' +
            '    (SELECT genre \n' +
            '     FROM userListens ul \n' +
            '     JOIN songGenre sg ON ul.song = sg.song \n' +
            '     WHERE ul.username = ? \n' +
            '     GROUP BY sg.genre \n' +
            '     ORDER BY COUNT(ul.song) DESC \n' +
            '     LIMIT 5) as top_genres ON sg.genre = top_genres.genre\n' +
            'WHERE \n' +
            '    s.song NOT IN (SELECT song \n' +
            '                   FROM userListens \n' +
            '                   WHERE username = ?)\n' +
            'GROUP BY \n' +
            '    s.song, s.songTitle, sf.popularity\n' +
            'ORDER BY \n' +
            '    COUNT(ul.song) DESC, \n' +
            '    sf.popularity DESC\n' +
            'LIMIT 30;\n';
        let recomResults = await new Promise((resolve, reject) => {
            connection.query(sqlRecom, [username, username], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        // Third Query
        const sqlSongAttributesBase = 'SELECT s.songTitle AS song, sa.album, g.genre, ar.artist FROM songs s JOIN songAlbum sa ON s.song = sa.song JOIN songGenre g ON s.song = g.song JOIN songArtist ar ON s.song = ar.song';

        const flattenedSongTitles = recomResults.map(row => row.song); // Assuming row.song is a string

        let sqlSongAttributes;
        let attributesResults;

        if (flattenedSongTitles.length > 0) {
            const inClause = flattenedSongTitles.map(() => '?').join(',');
            sqlSongAttributes = `${sqlSongAttributesBase} WHERE s.song IN (${inClause})`;

            attributesResults = await new Promise((resolve, reject) => {
                connection.query(sqlSongAttributes, flattenedSongTitles, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        } else {
            attributesResults = [];
        }
        return attributesResults;

    } catch (err) {
        console.error('SQL Error:', err);
        throw err;
    }
}

async function getUserSongs(username) {
    try {
        // First Query
        const sqlSong = 'SELECT distinct so.songTitle AS song, ul.rating, sf.danceability, sf.energy, sf.valence, sf.popularity FROM userListens ul JOIN songs so ON so.song = ul.song JOIN songfeatures sf on ul.song = sf.song WHERE ul.username = ?;';
        let songResults = await new Promise((resolve, reject) => {
            connection.query(sqlSong, [username], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        // Process the songResults
        const formattedResult = songResults.map(track => ({
            ...track,
            rating: parseFloat(track.rating),
            danceability: parseFloat(track.danceability),
            energy: parseFloat(track.energy),
            valence: parseFloat(track.valence),
            popularity: parseInt(track.popularity, 10)
        }));
        const optimumValues = calculateOptimumValues(formattedResult);

        // Second Query
        const sqlRecom = 'SELECT sq.song, sq.songTitle FROM (SELECT s.song, s.songTitle, sf.popularity, ABS(sf.danceability - ?) + ABS(sf.energy - ?) + ABS(sf.valence - ?) AS difference, ROW_NUMBER() OVER (PARTITION BY s.songTitle ORDER BY ABS(sf.danceability - ?) + ABS(sf.energy - ?) + ABS(sf.valence - ?)) as rn FROM songfeatures sf JOIN songs s ON sf.song = s.song JOIN songGenre sg ON s.song = sg.song LEFT JOIN userListens ul ON s.song = ul.song AND ul.username = ? WHERE ul.song IS NULL AND sg.genre IN (SELECT genre FROM userListens ul JOIN songGenre sg ON ul.song = sg.song WHERE ul.username = ?)) AS sq WHERE sq.rn = 1 ORDER BY sq.popularity ASC, sq.difference ASC LIMIT 30;';
        let recomResults = await new Promise((resolve, reject) => {
            connection.query(sqlRecom, [optimumValues["danceability"], optimumValues["energy"], optimumValues["valence"], optimumValues["danceability"], optimumValues["energy"], optimumValues["valence"], username, username], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        // Third Query
const sqlSongAttributesBase = 'SELECT s.songTitle AS song, sa.album, g.genre, ar.artist FROM songs s JOIN songAlbum sa ON s.song = sa.song JOIN songGenre g ON s.song = g.song JOIN songArtist ar ON s.song = ar.song';

const flattenedSongTitles = recomResults.map(row => row.song).flat();

let sqlSongAttributes;
let attributesResults;

if (flattenedSongTitles.length > 0) {
    // Generate the IN clause based on the length of the array
    const inClause = flattenedSongTitles.map(() => '?').join(',');
    sqlSongAttributes = `${sqlSongAttributesBase} WHERE s.song IN (${inClause})`;

    attributesResults = await new Promise((resolve, reject) => {
        connection.query(sqlSongAttributes, flattenedSongTitles, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
} else {
    // Handle the case where the array is empty
    sqlSongAttributes = sqlSongAttributesBase;
    attributesResults = [];
}

// Combine and return the results
return {
    attributes: attributesResults
};

    } catch (err) {
        console.error('SQL Error:', err);
        throw err; // Rethrow the error to handle it in the calling function
    }
}

async function getLikedSongs(username) {
    try {
        const sqlLikedSongs = "SELECT ul.song FROM userListens ul WHERE ul.rating >= 4 AND ul.username = ?";
        let likedSongsResult = await new Promise((resolve, reject) => {
            connection.query(sqlLikedSongs, [username], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        const spotifyRecommendations = await getRecommendationFromSpotify(likedSongsResult.slice(0,5).map(row => row.song));
        return spotifyRecommendations;

    } catch (err) {
        console.error('SQL Error:', err);
        throw err;
    }
}

async function getFriendRecommendations(username) {
    try {
        const sqlFriend = "SELECT DISTINCT s.song FROM follows f JOIN userListens ul ON f.followed = ul.username JOIN songGenre sg ON ul.song = sg.song JOIN songs s ON sg.song = s.song LEFT JOIN userListens ul2 ON s.song = ul2.song AND ul2.username = f.follower WHERE f.follower = ? AND ul2.song IS NULL;";
        let friendSongsResult = await new Promise((resolve, reject) => {
            connection.query(sqlFriend, [username], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        const sqlSongAttributesBase = 'SELECT s.songTitle AS song, sa.album, g.genre, ar.artist FROM songs s JOIN songAlbum sa ON s.song = sa.song JOIN songGenre g ON s.song = g.song JOIN songArtist ar ON s.song = ar.song';
        
        // Flatten the array of song titles
        const flattenedFriendSongTitles = friendSongsResult.map(row => row.song).flat();
        
        let sqlSongAttributes;
        let songAttributesResult;
        
        if (flattenedFriendSongTitles.length > 0) {
            // Generate the IN clause based on the length of the array
            const inClause = flattenedFriendSongTitles.map(() => '?').join(',');
            sqlSongAttributes = `${sqlSongAttributesBase} WHERE s.song IN (${inClause})`;
        
            songAttributesResult = await new Promise((resolve, reject) => {
                connection.query(sqlSongAttributes, flattenedFriendSongTitles, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        } else {
            // Handle the case where the array is empty
            sqlSongAttributes = sqlSongAttributesBase;
            songAttributesResult = [];
        }
        
        // Return the results
        return songAttributesResult;
        

    } catch (err) {
        console.error('SQL Error:', err);
        throw err; // Rethrow the error to handle it in the calling function
    }
}


app.get('/getRecommendations', verifyToken, async (req, res) => {
    const { username } = req.name;
    let combinedResults = {
        friendRecommendations: [],
        ourRecom: [],
        spotifyRecom: [],
        aiRecom: []
    };

    try {
        combinedResults.ourRecom = await getUserSongs(username);
        combinedResults.spotifyRecom = await getLikedSongs(username);
        combinedResults.friendRecommendations = await getFriendRecommendations(username);
        combinedResults.aiRecom = await getaiSongs(username);
        console.log(combinedResults);
        return res.status(201).json(combinedResults);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Internal Server Error' }); // Send an error response
    }

});

app.use('/change_password', (req, res) => {
    const { mail, oldPass, newPass } = req.query;

    const outsql = 'SELECT password, email FROM users WHERE email = ?';
    const insql = 'SELECT password, email FROM users WHERE email = ? AND password = ?';
    const resSql = 'UPDATE users SET password = ? WHERE email = ?';
    connection.query(outsql, [mail], (error, result) => {
        if (error) {
            return res.status(401).json( {message: 'No email could be found'} );
        }
        else {
            connection.query(insql, [mail, oldPass], (inerror, inresult) => {
                if (inerror) {
                    console.log(inerror);
                    return res.status(401).json( {message: 'password is wrong'} );
                }
                else {
                    connection.query(resSql, [newPass, mail], (resErr, resResult) => {
                        if (resErr) {
                            return res.status(401).json( {message: 'Error occured while changing password'} );
                        }
                        else if (!isStrongPassword(newPass)) {
                            return res.status(401).json({ message: 'Password is not strong enough' });
                        }
                        else {
                            return res.status(201).json({ message: 'Password changed'});
                        }
                    });
                }
            });
        }
    });
});

let globalMail = "";

async function registerUser(name, pass, mail) {
    if (!isStrongPassword(pass)) {
      throw new Error('Password is not strong (length >= 8, one upper, one lower, one numeric)');
    } else if (!name) {
      throw new Error('Username is required');
    }
  
    try {
      const usernameExists = await checkUsername(name);
      if (usernameExists) {
        throw new Error('Username already exists. Try another one');
      } else {
        const id = await insertData(name, pass, mail);
        return `Data inserted new user with ID ${id}`;
      }
    } catch (error) {
      console.error('Error occurred during registration:', error);
      throw error;
    }
}



app.use('/register', async (req, res) => {
    const { name, pass } = req.query;
    if (!(name && pass && globalMail)) {
        return res.status(400).json({message: 'There are empty inputs'});
    }
    if (!isStrongPassword(pass)) {
        return res.status(400).json({ message: 'Password is not strong (length >= 8, one upper, one lower, one numeric, one special)' });
    } else if (!name) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        const usernameExists = await checkUsername(name);
        if (usernameExists) {
            return res.status(400).json({ message: 'Username already exists. Try another one ' });
        } else {
            encryptedPass = await bcrypt.hash(pass, 10);
            const payload = { username: name }; 
            const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
            const id = await insertData(name, pass, globalMail);
            //const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
            return res.status(201).json({ token });
        }
    } catch (error) {
        console.error('Error occurred during registration:', error);
        return res.status(500).json({ message: 'Error occurred during registration', error: error.message });
    }
});


const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use the email service you prefer
    auth: {
      user: 'CS308Backend', // Your email address
      pass: process.env.SMTP_PW
    },
  });

let randomCode = 0;

app.post("/send-verification-email" , (req, res) => {
    const { userEmail } = req.query;
    
    if (!userEmail) {
        return res.status(400).json({ message: "Email address is required" });
    }

    // Generate a random 4-digit number
    randomCode = Math.floor(1000 + Math.random() * 9000);
  
    // Store the random number in the database
    const insertQuery = "INSERT INTO verification (email, code) VALUES (?, ?)";
  
    connection.query(insertQuery, [userEmail, randomCode], (error, results) => {
      if (error) {
        console.error("Error storing random number:", error);
        res.status(500).json({ message: "Internal server error" });
      } else {
        // Compose and send the email
        const mailOptions = {
          from: "cs308backend@gmail.com",
          to: userEmail,
          subject: "Email Verification",
          text: `Your verification code is: ${randomCode}`,
        };
  
        transporter.sendMail(mailOptions, (emailError, info) => {
          if (emailError) {
            console.error("Error sending email:", emailError);
            res.status(500).json({ message: "Internal server error" });
          } else {
            console.log("Email sent:", info.response);
            res.status(201).json({ message: "Mail delivered" });
            //next();
          }
        });
      }
    });
  });

  app.post("/verify", async (req, res) => {
    const { userCode, mail, user, pass } = req.query;

    const selectQuery = "SELECT COUNT(*) AS codeCount FROM verification WHERE email = ? AND code=?";

    connection.query(selectQuery, [mail, userCode], async (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
            return;
        }

        const codeCount = results[0].codeCount;

        try {
            await registerUser(user, pass, mail);

            if (codeCount > 0) {
                globalMail = mail;
                await verifyUser(mail);
                res.status(201).json({ message: "register OK" });
            } else {
                console.log(userCode + " " + mail);
                console.log("you cannot register");
                res.status(401).json({ message: "NOT verified" });
            }
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ message: error.message });
        }
    });
});



app.post('/follows', verifyToken, (req, res) => {
    const follower = req.name.username;

    const followed = req.body.inputValue;
    console.log(follower, followed);
    const sql = 'INSERT INTO follows (follower, followed) VALUES(?, ?)';

    connection.query(sql, [follower, followed], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Error while following' });
        }
        else {
            return res.status(201).json({
                message: 'Successfully followed',
                follower: follower,
                followed: followed
                });
        }
    });
});

app.get('/get_usernames', async (req,res) => {
    const sql = 'select username from users';

    connection.query(sql, (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Error while getting usernames' });
        }
        else {
            return res.status(201).json(result);
        }
    });
});



app.get('/follower-count', verifyToken, (req, res) => {
    const username = req.name.username;
    //console.log(username);
    //const sql  = 'SELECT followed, COUNT(follower) AS follower_count FROM follows WHERE followed = ? GROUP BY followed;';
    const sql = 'Select count(*) as follower_count from follows where followed = ?';

    connection.query(sql, [username], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot get the follower count' });
        }
        else {
            //console.log(result[0].follower_count);
            return res.status(201).json( {
                username: username,
                followerCount: result[0].follower_count
            });
        }
    })
});

app.use('/delete-user', (req, res) => {
    const { username, userEmail } = req.query;
    const sql = 'DELETE FROM follows WHERE followed = ? OR follower= ?';
    const mailText = 'Dear ${username},\n We are very sorry to inform you that your account is deleted by your intend.\nWe hope see you again O7';
    connection.query(sql, [username, username], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(401).json({ message: 'No account has been found with given username and email combination' });
        }
        else {
            const mailOptions = {
                from: "cs308backend@gmail.com",
                to: userEmail,
                subject: "Deletion",
                text: mailText,
            };
        
            transporter.sendMail(mailOptions, (emailError, info) => {
                if (emailError) {
                  console.error("Error sending email:", emailError);
                  res.status(500).json({ message: "Internal server error" });
                } else {
                  console.log("Email sent:", info.response);
                  res.status(201).json({ message: "Mail delivered" });
                  //next();
                }
              });
        }
    })
});

/*
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRlbW9yIiwiaWF0IjoxNjk5OTY4MDcxLCJleHAiOjE2OTk5NzE2NzF9.uW2Dd6TNbosSAdSUCk5AkO8KrmiDiGJB5TG5IoU3Slg
username: demor
*/

app.post('/login', async (req, res) => {
    const { name, pass } = req.query;
    if (!(name && pass)) {
        return res.status(400).json( {message: "All inputs are required" } );
    }
    try {
        const usernameExist = await checkUsername(name);
        if (!usernameExist) {
            return res.status(404).json( { message: 'There is no user exist as ${name}'} );
        }
        else {
            const check = await checkPass(name, pass);
            //console.log(check);
            if ( check ) {
                //authenticateUser(name, 1);
                const payload = { username: name }; 
                const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
                return res.status(201).json({ token });
            }
            else {
                return res.status(401).json( { message: 'wrong password'} );
            }
        }
    }
    catch(error) {
        return res.status(500).json( { message: 'Error occured during login', error: error.message});
    }
})

app.get('/getLibrary', verifyToken, async (req, res) => {
    const { username } = req.name;

    const sql = "SELECT so.songTitle AS song, sa.album, g.genre, ul.rating, ar.artist FROM userListens ul JOIN songs so ON so.song = ul.song JOIN songAlbum sa ON ul.song = sa.song JOIN songGenre g ON ul.song = g.song JOIN songArtist ar ON ul.song = ar.song WHERE ul.username = '" + username +"';";

    connection.query(sql, [username], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot get the song library' });
        } else {
            return res.status(201).json(result);
        }
    });
});

app.get('/getFormattedLibrary', verifyToken, async (req, res) => {
    const { username } = req.name;
    console.log(username);

    // Get song as songTitle
    const sql = `SELECT * FROM userlistens WHERE username = ?`;
    const [songs] = await connection.promise().query(sql, username);
    let final_songs = [];
    for (const song of songs) {
        let temp = song;
        const sqlTitle = 'SELECT songTitle FROM songs WHERE song = ?;';
        const [songTitle] = await connection.promise().query(sqlTitle, song.song);
        const sqlAlbum = 'SELECT album FROM songAlbum WHERE song = ?;';
        const [albums] = await connection.promise().query(sqlAlbum, song.song);
        const sqlArtist = 'SELECT artist FROM songArtist WHERE song = ?;';
        const [artists] = await connection.promise().query(sqlArtist, song.song);
        const sqlGenre = 'SELECT genre FROM songGenre WHERE song = ?;';
        const [genres] = await connection.promise().query(sqlGenre, song.song);
        const sqlFeatures = 'SELECT * FROM songFeatures WHERE song = ?;';
        const [features] = await connection.promise().query(sqlFeatures, song.song);
        temp.albums = albums.map(row => row.album);
        temp.artists = artists.map(row => row.artist);
        temp.genres = genres.map(row => row.genre);
        temp.features = features[0];
        temp.songTitle = songTitle[0].songTitle;
        final_songs.push(temp);
    }

    return res.status(201).json(final_songs);
});



app.get(
    '/getAllSongs', async (req, res) => {
        // Get all songs from the songs table starting from the index req.cursor
        let { cursor, limit, search } = req.query;
        if(!search) search = "";
        if(!cursor) cursor = 0;
        if(!limit) limit = 30;

        // Get all songs from the songs table starting from the index req.cursor, with a limit of req.limit, and filtered by req.search
        const sql = `SELECT * FROM songs WHERE songTitle LIKE '%${search}%' LIMIT ${cursor}, ${limit}`;
        const [songs] = await connection.promise().query(sql);
        let final_songs = [];
        for (const song of songs) {
            const sqlAlbum = 'SELECT album FROM songAlbum WHERE song = ?;';
            const [albums] = await connection.promise().query(sqlAlbum, song.song);
            const sqlArtist = 'SELECT artist FROM songArtist WHERE song = ?;';
            const [artists] = await connection.promise().query(sqlArtist, song.song);
            const sqlGenre = 'SELECT genre FROM songGenre WHERE song = ?;';
            const [genres] = await connection.promise().query(sqlGenre, song.song);
            const sqlFeatures = 'SELECT * FROM songFeatures WHERE song = ?;';
            const [features] = await connection.promise().query(sqlFeatures, song.song);
            final_songs.push({
                song: song.song,
                songTitle: song.songTitle,
                albums: albums.map(row => row.album),
                artists: artists.map(row => row.artist),
                genres: genres.map(row => row.genre),
                features: features[0],
            });
        }
        return res.status(200).json(final_songs);
    }
);


app.get('/followed_users', verifyToken, (req,res) => {
    const username = req.name.username;
    const sql = 'Select followed from follows where follower = ?';

    connection.query(sql, [username], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot get the followed_users' });
        }
        else {
            return res.status(201).json( {
                username: username,
                followed_users: result
            });
        }
    })
})

//app.use(bodyParser.json());
app.get('/get_top5', verifyToken, (req,res) =>{
    const username = req.query.user;
    const sql = 'SELECT songs.songTitle FROM userListens JOIN songs ON userListens.song = songs.song WHERE userListens.username = ? ORDER BY userListens.rating DESC LIMIT 5;';

    connection.query(sql, [username], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot get the followed_users' });
        }
        else {
            console.log(result);
            return res.status(201).json( {
                username: username,
                songs: result
            });
        }
    })
})

app.get('/analysis_data', verifyToken, (req,res)=>{
    const username = req.name.username;

    const sql = 'SELECT AVG(f.danceability) as danceability, AVG(f.energy) as energy, AVG(f.valence) as valence, AVG(f.popularity) as popularity from songfeatures f, userListens u where u.song = f.song AND u.username = ?;'

    connection.query(sql, [username], (err, result) => {
        console.log(result);
        if (err) {
            return res.status(401).json({ message: 'Cannot get the followed_users' });
        }
        else {
            console.log(result);
            return res.status(201).json({result});
        }
    })
})

app.post('/changeRating', verifyToken,(req, res) => {
    const username = req.name.username;
    const rating = req.body.new_rating;
    const song = req.body.song_name;

    // Check if the required fields are present
    if (!rating || !song) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const sql = 'update userListens set rating = ? where username = ? and song IN (select song from songs where songTitle = ?)';

    connection.query(sql, [rating, username, song], (err, result) => {
        if (err) {
            return res.status(401).json({ message: 'Cannot update the rating' });
        } else {
            return res.status(201).json({result});
        }
    });
});


app.use('/logout', async (req, res) => {
    const { name } = req.query;

    try {
        const usernameExist = await checkUsername(name);
        if (!usernameExist) {
            return res.status(404).json( { message: 'There is no user exist as ${name}'} );
        }
        else {
            authenticateUser(name, 0);
            return res.status(201).json( { message: 'Successfully logout'} );
        }
    }
    catch(error) {
        return res.status(500).json( { message: 'Error occured during login', error: error.message});
    }
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

module.exports = app;


