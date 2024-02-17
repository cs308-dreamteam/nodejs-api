const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const { URLSearchParams } = require('url');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const app = express();
const port = 5000;

app.use(session({
  secret: 'a123-b123-c123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Note: Change to true if using HTTPS
}));

const CLIENT_ID = process.env.SWA_CLIENT_ID;
const CLIENT_SECRET = process.env.SWA_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5000/callback';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE_URL = 'https://api.spotify.com/v1/';

app.get('/', (req, res) => {
  res.send("Welcome to Spotify App <a href='/login'>Login with Spotify</a>");
});

app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email user-library-read';
  const state = uuidv4();

  req.session.state = state;

  const params = {
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: scope,
    redirect_uri: REDIRECT_URI,
    state: state,
    show_dialog: true // for testing purposes
  };

  const authUrl = `${AUTH_URL}?${querystring.stringify(params)}`;

  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  if (req.query.error) {
    return res.json({ error: req.query.error });
  }

  if (req.query.code) {
    const requestBody = {
      code: req.query.code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    };

    try {
      const response = await axios.post(TOKEN_URL, querystring.stringify(requestBody), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenInfo = response.data;

      req.session.access_token = tokenInfo.access_token;
      req.session.refresh_token = tokenInfo.refresh_token;
      req.session.expires_at = Date.now() + 10 * 1000; // 10 seconds

      return res.redirect('/tracks');
    } catch (error) {
      return res.json({ error: 'Unable to get access token' });
    }
  }
});

app.get('/artists', (req, res) => {
  if (!req.session.access_token) {
    return res.redirect('/login');
  }

  if (Date.now() > req.session.expires_at) {
    console.log('TOKEN EXPIRED. REFRESHING...');
    return res.redirect('/refresh-token');
  }

  const headers = {
    Authorization: `Bearer ${req.session.access_token}`
  };

  const limit = 10;
  axios.get(`${API_BASE_URL}me/tracks?limit=${limit}`, { headers })
    .then(response => {

      // // Get track's artist name
      const artistNames = response.data.items.map(item => item.track.artists[0].name);
      res.json({ artistNames })

      // // Get track's full info
      // const tracks = response.data.items.map(item => item.track);
      // res.json({ tracks });

      // // Get artists' full info
      // const artists = response.data.items.map(item => item.track.artists);
      // res.json({ artists });
    })
    .catch(error => res.json({ error: 'Unable to fetch artists' }));
});

app.get('/tracks', (req, res) => {
  if (!req.session.access_token) {
    return res.redirect('/login');
  }

  if (Date.now() > req.session.expires_at) {
    console.log('TOKEN EXPIRED. REFRESHING...');
    return res.redirect('/refresh-token');
  }

  const headers = {
    Authorization: `Bearer ${req.session.access_token}`
  };

  const limit = 10;
  axios.get(`${API_BASE_URL}me/tracks?limit=${limit}`, { headers })
    .then(response => {

      const tracknames = response.data.items.map(item => item.track.name);
      res.json({ tracknames });

      // // Get track's full info
      // const tracks = response.data.items.map(item => item.track);
      // res.json({ tracks });

      // // Get artists' full info
      // const artists = response.data.items.map(item => item.track.artists);
      // res.json({ artists });
    })
    .catch(error => res.json({ error: 'Unable to fetch artists' }));
});

app.get('/refresh-token', async (req, res) => {
  if (!req.session.refresh_token) {
    return res.redirect('/login');
  }

  if (Date.now() > req.session.expires_at) {
    console.log('TOKEN EXPIRED. REFRESHING...');

    const requestBody = {
      grant_type: 'refresh_token',
      refresh_token: req.session.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    };

    try {
      const response = await axios.post(TOKEN_URL, querystring.stringify(requestBody), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const newTokenInfo = response.data;

      req.session.access_token = newTokenInfo.access_token;
      req.session.expires_at = Date.now() + 10 * 1000; // 10 seconds

      return res.redirect('/tracks');
    } catch (error) {
      return res.json({ error: 'Unable to refresh access token' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
