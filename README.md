# Description for the Node.js API

This Node.js API provides various functionalities for a music application. Below is a detailed documentation of each endpoint, explaining their purpose, request methods, and the required parameters.

## Setup and Usage
- Clone the repository.
- Create a mysql database called `db`.
- Create the necessary tables by using the sql statements in the file `models/enhancedCT.sql`.
- Populate your database by running the python file `models/308tracks.py`.
- Finally to use this API, install dependencies with `npm install`, and start the server with `npm start`.


## ER Diagram of the Database
<img width="950" alt="Screenshot 2023-12-11 at 03 54 28" src="https://github.com/cs308-dreamteam/nodejs-api/assets/111140694/791dcef6-ca65-44cf-b132-42e9aef43d34">


## Endpoints

| #  | Route                    | Method | Parameters                              | Description                                   |
|----|--------------------------|--------|-----------------------------------------|-----------------------------------------------|
| 1  | `/spotifyGetPlaylist`    | GET    |                                         | Retrieves the user's Spotify playlists.       |
| 2  | `/spotifyAuthorize`      | GET    |                                         | Redirects to Spotify for user authorization.  |
| 3  | `/callback`              | GET    |                                         | Callback endpoint for Spotify authorization.  |
| 4  | `/login`                 | POST   | name: Username<br>pass: Password        | Log in a user.                                |
| 5  | `/register`              | POST   | name: Username<br>pass: Password        | Register a new user.                          |
| 6  | `/send-verification-email` | POST | userEmail: User's email address        | Send an email for user verification.          |
| 7  | `/verify`                | POST   | userCode: Verification code<br>mail: Email<br>user: Username<br>pass: Password | Verify user account.                       |
| 8  | `/follows`               | POST   | inputValue: Username to follow          | Follow a user.                                |
| 9  | `/get_usernames`         | GET    |                                         | Retrieve a list of usernames.                 |
| 10 | `/follower-count`        | GET    |                                         | Get the follower count of a user.             |
| 11 | `/delete-user`           | DELETE | username: Username<br>userEmail: Email  | Delete a user account.                        |
| 12 | `/change_password`       | POST   | mail: Email<br>oldPass: Old Password<br>newPass: New Password | Change a user's password.                 |
| 13 | `/get_user`              | GET    |                                         | Retrieve user information.                    |
| 14 | `/getLibrary`            | GET    |                                         | Get the user's music library.                 |
| 15 | `/getRecommendations`    | GET    |                                         | Get music recommendations for the user. (3 types of recommendation is provided)      |
| 16 | `/followed_users`        | GET    |                                         | Get a list of users followed by a user.       |
| 17 | `/get_top5`              | GET    | user: Username                           | Get top 5 songs of a user.                     |
| 18 | `/logout`                | POST   | name: Username                           | Log out a user.                               |
| 19 | `/add_song`              | POST   | songList: Array of song objects          | Add songs to the user's library.              |
| 20 | `/delete_song`           | DELETE | title: Song title                        | Delete a song from the user's library.        |
| 21 | `/upload_image`          | POST   | image: Base64 image string               | Upload a profile image for the user.          |


## Recommendation Types
- Our Recommendation: System makes a query to its database that is designed to recommend up to 30 new songs to a user. The recommendations are based on the user's music preferences (in terms of danceability, energy, and valence) and genres they have listened to, while ensuring that the songs haven't been listened to by the user yet. The recommendations are ordered by increasing popularity and decreasing similarity to the user's preferences (i.e., smaller differences in features are preferred).

- Spotify's Recommendation: System makes an API call to Spotify Web API, with the seed values of user's top artists, genres, and tracks, to get 30 song recommendations.

- Friend's Recommendation: System queries for the songs that the user's following users like and are listening to and finds the similar songs that the user hasn't listened.


## Contribution
Contributions to this project are welcome. Please fork the repository, make your changes, and submit a pull request.
