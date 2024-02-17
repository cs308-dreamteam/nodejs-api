import mysql.connector
from mysql.connector import errorcode
from mysql.connector import Error
import pandas as pd
from dotenv import load_dotenv
import os

load_dotenv()
access_token = os.environ.get('ACCESS_TOKEN')
db_pw = os.envrion.get("DB_PW")

def create_connection():
    try:
        cnx = mysql.connector.connect(user="root", password=db_pw, database="db")
        print("Connection established with the database")
        return cnx
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Something is wrong with your user name or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print(err)
        return None
    else:
        cnx.close()
        return None


def execute_query(connection, query, data=None):
    cursor = connection.cursor()
    try:
        if data:
            cursor.execute(query, data)
        else:
            cursor.execute(query)
        connection.commit()
        print("Query executed successfully")
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()



def create_table(connection, table_name, fields):
    query = f"CREATE TABLE {table_name} ("

    for column_name, column_type in fields.items():
        query += f" {column_name} {column_type},"
    query = query[:-1] + ");"
    print(query)
    execute_query(connection=connection, query=query)


def insert_song(connection, data, data2, data3, data4, data5):
    query = "INSERT IGNORE INTO songs (song, songTitle) VALUES (%s,%s)"
    execute_query(connection, query, data)

    query2 = "INSERT IGNORE INTO songFeatures (song, danceability, energy, valence, popularity) VALUES (%s,%s,%s,%s,%s)"
    execute_query(connection, query2, data2)

    for artist in data3[1]:
        data33 = (data3[0], artist[1:-1])
        query3 = "INSERT IGNORE INTO songArtist (song, artist) VALUES (%s,%s)"
        execute_query(connection, query3, data33)

    for genre in data4[1]:
        data44 = (data4[0], genre)
        query4 = "INSERT IGNORE INTO songGenre (song, genre) VALUES (%s,%s)"
        execute_query(connection, query4, data44)

    query5 = "INSERT IGNORE INTO songAlbum (song, album) VALUES (%s,%s)"
    execute_query(connection, query5, data5)



def read_songs(connection):
    query = "SELECT * FROM songs"
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        records = cursor.fetchall()
        for record in records:
            print(record)
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()



def read_artists(connection):
    query = "SELECT * FROM songArtist"
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        records = cursor.fetchall()
        for record in records:
            print(record)
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()


def read_features(connection):
    query = "SELECT * FROM songFeatures"
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        records = cursor.fetchall()
        for record in records:
            print(record)
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()


def read_genres(connection):
    query = "SELECT * FROM songGenre"
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        records = cursor.fetchall()
        for record in records:
            print(record)
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()


def read_albums(connection):
    query = "SELECT * FROM songAlbum"
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        records = cursor.fetchall()
        for record in records:
            print(record)
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()


connection = create_connection()

import requests

token = access_token


def get_track_info(track_id, token):
    track_url = f"https://api.spotify.com/v1/tracks/{track_id}"
    headers = {
        'Authorization': f'Bearer {token}'
    }
    response = requests.get(track_url, headers=headers)
    track_data = response.json()

    artist_id = track_data['artists'][0]['id']

    artist_url = f"https://api.spotify.com/v1/artists/{artist_id}"
    response = requests.get(artist_url, headers=headers)
    artist_data = response.json()
    genres = artist_data['genres']

    return track_data.get('album').get('name'), genres



def return_songIDs(connection):
    id_list = []
    query = "SELECT * FROM songs"
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        records = cursor.fetchall()
        for record in records:
            id_list.append(record["song"])
        return id_list
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()


df = pd.read_csv("tracks_reduced.csv")
for _, row in df.iterrows():
    data = (row["id"], row["name"])
    data2 = (row["id"], float(row["danceability"]), float(row["energy"]), float(row["valence"]), float(row["popularity"]))
    data3 = (row["id"], row["artists"][1:-1].split(", "))
    albumName, genres = get_track_info(row["id"], token)
    data4 = (row["id"], genres)
    data5 = (row["id"], albumName)
    insert_song(connection, data, data2, data3, data4, data5)

#
# read_genres(connection)
# read_albums(connection)

