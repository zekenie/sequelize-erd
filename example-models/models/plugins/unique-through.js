'use strict';
/* eslint-disable semi, global-require, arrow-spacing, no-unused-expressions, no-return-assign */

const Sequelize = require('sequelize');
const _ = require('lodash');

const describe = global.describe || (()=>{})

describe('unique (deep: String) through (near: String)', ()=>{
  const expect = require('chai').expect
  const def = unique('artists').through('songs')

  it('provides a Sequelize virtual column definition', ()=>{
    expect(def).to.be.a.object
    expect(def.type).to.equal(Sequelize.VIRTUAL)
    expect(def.get).to.be.a.function
  })

  describe('defines a getter', ()=>{
    var allArtists
    const [teganAndSara,
           yeahYeahYeahs,
           sleaterKinney,
           miley,
           joanJett] = allArtists = [{artist: 'Tegan and Sara', id: 0},
                                     {artist: 'The Yeah Yeah Yeahs', id: 1},
                                     {artist: 'Sleater Kinnety', id: 2},
                                     {artist: 'Miley Cyrus', id: 3},
                                     {artist: 'Joan Jett', id: 4}]

    it('returns unique (by id) instances of the deep model via the through model', ()=>{
      let uniqueArtists = def.get.apply({
        songs: [
          {title: 'Divided', artists: [teganAndSara]},
          {title: 'Jumpers', artists: [sleaterKinney]},
          {title: 'Heads Will Roll', artists: [yeahYeahYeahs]},
          {title: 'Maps', artists: [yeahYeahYeahs]},
          {title: 'Bad Reputation', artists: [miley, joanJett]}
        ]
      })
      expect(_.sortBy(uniqueArtists, artist => artist.id)).to.eql(allArtists)
    })

    it('caches results', ()=>{
      let spy = {
        getSongsCalled: 0,
        get songs() {
          ++this.getSongsCalled
          return [
            {artists: [{id: 1}]},
            {artists: [{id: 2}]}
          ]
        }
      }
      def.get.apply(spy)
      def.get.apply(spy)
      expect(spy.getSongsCalled).to.equal(1)
    })
  })
})

function unique(deepColumn) {
  return {
    through: function(nearColumn) {
      return {
        type: Sequelize.VIRTUAL,
        get: function() {
          const key = `._unique_${deepColumn}_through_${nearColumn}_`
          if (this[key]) return this[key]
          var collection = _.chain(this[nearColumn])
            .flatMap(obj => obj[deepColumn])
            .filter(_.isObject)
            .uniqBy(model => model.id)
            .value()
          if (!collection.length) return
          return this[key] = collection
        }
      }
    }
  }
}

module.exports = unique
