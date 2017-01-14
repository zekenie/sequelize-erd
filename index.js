const Vis = require('./graphvis');
let Sequelize;
const relationship = ({source, target, associationType, as}) => {
  const typeString = {
    BelongsTo: `[arrowtail=crow, arrowhead=odot, dir=both]`,
    BelongsToMany: `[arrowtail=crow, arrowhead=crow, dir=both, label="${as}"]`,
  }[associationType];
  if (typeString) {
    return `"${source.name}" -> "${target.name}" ${typeString}`;
  }
}

const typeName = (columnType) => {
  for(let name in Sequelize.DataTypes) {
    let type = Sequelize.DataTypes[name];
    if(columnType instanceof type && name !== 'ABSTRACT') {
      return name;
    }
  }
}

const attributeTemplate = attribute => `${attribute.fieldName} :${typeName(attribute.type)}\\l\\`;

const modelTemplate = model => `"${model.name}" [shape=record, label="{${model.name}|\
      ${Object.values(model.attributes).map(attributeTemplate).join('\n')}
    }"]`;

module.exports = path => {
  const db = typeof path === 'string' ? require(path) : path;
  Sequelize = db.constructor;
  const models = Object.values(db.models);
  return Vis(`
    digraph models_diagram {
      graph[overlap=false, splines=true]
      ${models.map(modelTemplate).join('\n')}
      ${models.map(model => Object.values(model.associations).map(relationship).join('\n')).join('\n')}
  }`, {
    format: 'svg',
    engine: 'dot'
  });
};