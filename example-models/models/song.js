'use strict';

const db = require('../db');
const DataTypes = db.Sequelize;

module.exports = db.define('song', {
  name: {
    type: DataTypes.STRING(1e4), // eslint-disable-line new-cap
    allowNull: false,
    set: function (val) {
      this.setDataValue('name', val.trim());
    }
  },
  genre: {
    type: DataTypes.STRING,
  },
  url: {
    type: DataTypes.STRING(1e4), // eslint-disable-line new-cap
    allowNull: false
  },
}, {
  defaultScope: {
    attributes: {
      include: ['albumId'], // excluded by default, need for `song.getAlbum()`
    },
  },
  scopes: {
    populated: () => ({ // function form lets us use to-be-defined models
      include: [{
        model: db.model('artist')
      }]
    })
  },
  instanceMethods: {
    toJSON: function () { // overriding toJSON to prevent url from leaking to client
      const plain = this.get({plain: true});
      delete plain.url;
      return plain;
    }
  }
});
