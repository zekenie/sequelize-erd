const Vis = require("./graphvis");
const { Module, render } = require("./visRenderer");
const { groupBy } = require('lodash');

let Sequelize;

const relationships = (associations, customArrowShapes = {}, arrowSize = 0.6) => {
  const arrowShapes = Object.assign({
    BelongsToMany: ['none', 'crow'],
    BelongsTo: ['crow', 'none'],
    HasMany: ['none', 'crow'],
    HasOne: ['none', 'none'],
  }, customArrowShapes);

  const associationsByType = groupBy(associations, association => association.associationType)

  const diagramArrowShapes = [  // Follow this heirarchy to ensure the arrows are set up correctly, eg. HasOne specifications override BelongsTo
    'BelongsToMany',
    'BelongsTo',
    'HasMany',
    'HasOne',
  ].reduce((result, type) => {
    const associationsOfType = associationsByType[type] || [];
    for (const association of associationsOfType) {
      const modelNames = {
        source: association.source.name,
        target: association.through ? association.through.model.name : association.target.name,
      };

      const modelArrowShapes = {
        [modelNames.source]: arrowShapes[type][0],
        [modelNames.target]: arrowShapes[type][1],
      };

      const existing = result.find(modelArrow => modelArrow[modelNames.source] && modelArrow[modelNames.target]);
      
      if (!existing) result.push(modelArrowShapes);
      else {
        existing[modelNames.source] = modelArrowShapes[modelNames.source];
        existing[modelNames.target] = modelArrowShapes[modelNames.target];
      }
    }

    return result;
  }, []);

  return diagramArrowShapes
    .map(Object.entries)  // Turns diagramArrowShapes into items like [ [sourceName, arrowShapes], [targetName, arrowShapes] ] to save a step
    .map(
      entries =>  // Now entries are accessed via entries[0] == [sourceName, arrowShapes] and entries[1] == [targetName, arrowShapes]
      entries.length == 1 // If source and target names are the same (resulting in one key)
      ? `"${entries[0][0]}" -> "${entries[0][0]}" [arrowtail=${entries[0][1]}, arrowhead=none, dir=both, arrowsize=${arrowSize.toString()}]`
      : `"${entries[0][0]}" -> "${entries[1][0]}" [arrowtail=${entries[0][1]}, arrowhead=${entries[1][1]}, dir=both, arrowsize=${arrowSize.toString()}]`,
    );
};

const typeName = columnType => {
  for (let name in Sequelize.DataTypes) {
    let type = Sequelize.DataTypes[name];

    if (typeof columnType === "string") {
      return columnType;
    }

    if (columnType instanceof type && name !== "ABSTRACT") {
      return name;
    }
  }
};

const customAttribute = (attribute) => {
  if (attribute.primaryKey) return `<u>${attribute.fieldName}</u>`;
  else if (attribute.references) return `<u><i>${attribute.fieldName}</i></u>`;
  return attribute.fieldName;
};

const attributeTemplate = (attribute, i) =>
  `<tr><td port="${i}" align="left">${customAttribute(attribute)}: ${typeName(
    attribute.type
  )}</td></tr>`;

const modelTemplate = ({ model, columns }) => `"${
  model.name
}" [shape=none, margin=0, label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4">
    <tr><td bgcolor="lightblue"><b>${model.name}</b></td></tr>
    ${
      columns
        ? Object.values(model.rawAttributes)
            .map(attributeTemplate)
            .join("\n")
        : ""
    }
  </table>>]`;

function omit(obj, ...toOmit) {
  const newObj = { ...obj };
  for (const prop of toOmit) {
    delete newObj[prop];
  }
  return newObj;
}

function pick(obj, ...toPick) {
  const newObj = {};
  for (const prop of toPick) {
    newObj[prop] = obj[prop];
  }
  return newObj;
}

function parseList(str) {
  return str.split(",").map(s => s.trim());
}

const utils = { parseList, pick, omit };

function pickModels({ include, omit, source }) {
  const db = typeof source === "string" ? require(source) : source;
  if (db.constructor.name !== "Sequelize") {
    console.error(
      `⚠️   \`${source}\` doesn't export a sequelize instance. See the \`example-models\` folder for an example`
    );
    return;
  }
  Sequelize = db.constructor;

  let modelsObj = db.models;

  if (include) {
    modelsObj = utils.pick(modelsObj, ...utils.parseList(include));
  }

  if (omit) {
    modelsObj = utils.omit(modelsObj, ...utils.parseList(omit));
  }

  return modelsObj;
}

function generateDot({
  models,
  associations,
  columns = true,
  arrowShapes = {},
  arrowSize = 0.6,
  color = 'black',
  lineWidth = 0.75,
}) {
  columns = {
    true: true,
    false: false
  }[columns];

  if (associations) {
    associations = utils.parseList(associations);
  }

  function matchesAssociation(association) {
    if (!associations) {
      return true;
    }
    return (
      associations.includes(association.source.name) ||
      associations.includes(association.target.name)
    );
  }

  modelsArr = Object.values(models);

  const associationsArr = modelsArr.reduce((result, model) =>
    [...result, ...Object.values(model.associations).filter(
      association =>
        !!models[association.source.name] &&
        !!models[association.target.name] &&
        matchesAssociation(association)
    )], []);

  if (!modelsArr.length) {
    console.error(
      `⚠️   Oops! It looks like \`sequelize-erd\` can't see your models. Make sure your source file exports sequelize *and* requires your models`
    );
    return;
  }

  function modelFilter(model) {
    if (!associations) {
      return true;
    }
    return Object.values(model.associations).some(matchesAssociation);
  }
  return `
  digraph models_diagram {
    graph [pad="0.5", nodesep=".5", ranksep="2", overlap="false"];
    edge [concentrate=true, color=${color}, penwidth=${lineWidth.toString()}];
    node[fontsize=10];
    ${columns ? "" : "esep=1;"}
    rankdir=LR;
    ${modelsArr
      .filter(modelFilter)
      .map(model => modelTemplate({ model, columns }))
      .join("\n")}
    ${relationships(associationsArr, arrowShapes, arrowSize).join("\n")}
}`;
}

module.exports = ({
  source,
  include,
  omit,
  format = "svg",
  engine = "circo",
  ...rest
}) => {
  const models = pickModels({ source, include, omit });
  // console.log(Vis);
  const src = generateDot({ ...rest, models });
  const vis = new Vis({ Module, render });
  return vis.renderString(src, {
    format,
    engine
  });
};
