const Sequelize = require('sequelize');
const db = require('./example-models');
const sequelizeErd =  require('.');
const { writeFileSync } = require('fs');

sequelizeErd({
    source: db,
    engine: 'circo',
  })
    .then(svg => {
      writeFileSync('./sample.svg', svg);
    })
    .catch(e => {
      console.error(e);
    });