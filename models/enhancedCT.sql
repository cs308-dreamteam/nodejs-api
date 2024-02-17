create table users(
	username VARCHAR(255) primary key,
    email Varchar(255) NOT NULL,
    password Varchar(255) NOT NULL
);

create table songs(
	song VARCHAR(255) primary key,
	songTitle Varchar(255)
);

create table songfeatures(
	song VARCHAR(255) primary key, 
	danceability REAL,
    energy REAL,
    valence REAL,
    popularity int,
    foreign key (song) references songs(song) ON UPDATE CASCADE ON DELETE CASCADE
);

create table userListens(
	song VARCHAR(255),
    username VARCHAR(255),
    rating int check (rating between 0 and 5),
    primary key(song, username),
    foreign key (song) references songs(song) ON UPDATE CASCADE ON DELETE CASCADE,
    foreign key (username) references users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

create table songAlbum(
	song VARCHAR(255),
    album Varchar(255),
    primary key(song, album),
    foreign key (song) references songs(song) ON UPDATE CASCADE ON DELETE CASCADE
);

create table songGenre(
	song VARCHAR(255),
    genre Varchar(255),
    primary key(song, genre),
    foreign key (song) references songs(song) ON UPDATE CASCADE ON DELETE CASCADE
);

create table songArtist(
	song VARCHAR(255),
    artist Varchar(255),
    primary key(song, artist),
    foreign key (song) references songs(song) ON UPDATE CASCADE ON DELETE CASCADE
);

create table verification(
	email Varchar(255) primary key,
    code int
);

create table user_pp(
	username varchar(255) primary key,
    path varchar(255),
    foreign key (username) references users(username)
);

create table follows (
	follower varchar(255),
    followed varchar(255),
    primary key(follower, followed),
    foreign key (follower) references users(username),
    foreign key (followed) references users(username)
);

ALTER TABLE users ADD verified int;
