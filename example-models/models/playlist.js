'use strict';

const db = require('../db');
const DataTypes = db.Sequelize;
const unique = require('./plugins/unique-through');

module.exports = db.define('playlist', {

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    set: function (val) {
      this.setDataValue('name', val.trim());
    }
  },
  artists: unique('artists').through('songs')

}, {

  scopes: {
    populated: () => ({ // function form lets us refer to undefined models
      include: [{
        model: db.model('song').scope('defaultScope', 'populated')
      }]
    })
  },
  instanceMethods: {
    addAndReturnSong: function (songId) { // `addSong` doesn't promise a song.
      songId = String(songId);
      const addedToList = this.addSong(songId);
      const songFromDb = db.model('song')
      .scope('defaultScope', 'populated')
      .findById(songId);
      return DataTypes.Promise.all([addedToList, songFromDb])
      .spread((result, song) => song);
    }
  }

});
