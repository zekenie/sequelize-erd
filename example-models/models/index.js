// Require our models. Running each module registers the model into sequelize
// so any other part of the application could call sequelize.model('Song')
// to get access to the Song model.

const Playlist = require("./playlist");
const Artist = require("./artist");
const ArtistInfo = require('./artistInfo');
const Album = require("./album");
const Song = require("./song");

// Form the associations

Song.belongsTo(Album);
Album.hasMany(Song);
Album.belongsTo(Artist); // "Album Artist" is a thing, even if there are
// other artists on the album.

Artist.belongsToMany(Song, { through: "artistSong" });
Song.belongsToMany(Artist, { through: "artistSong" });

Song.belongsToMany(Playlist, { through: "playlistSong" });
Playlist.belongsToMany(Song, { through: "playlistSong" });

// HasOne example to show the correct arrow'ing in Viz
ArtistInfo.belongsTo(Artist);
Artist.hasOne(ArtistInfo);

// exported just in case, but can also be fetched via db.model('Album') etc.

module.exports = {
  Album,
  Song,
  Artist,
  ArtistInfo,
  Playlist
};
