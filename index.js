const Vis = require("./graphvis");
const { Module, render } = require("./visRenderer");

let Sequelize;

const relationships = (associations, arrowShapes = {}) => {
  const mappings = [];

  const mapper = {
    associationTypes: new Map([
      ['BelongsToMany', {
        typeArrowShapes: arrowShapes['BelongsToMany']
          ? arrowShapes['BelongsToMany']
          : ['none', 'crow'],
        items: []
      }],
      ['BelongsTo', {
        typeArrowShapes: arrowShapes['BelongsTo']
          ? arrowShapes['BelongsTo']
          : ['crow', 'none'],
        items: []
      }],
      ['HasMany', {
        typeArrowShapes: arrowShapes['HasMany']
          ? arrowShapes['HasMany']
          : ['none', 'crow'],
        items: []
      }],
      ['HasOne', {
        typeArrowShapes: arrowShapes['HasOne']
          ? arrowShapes['HasOne']
          : ['none', 'none'],
        items: []
      }],
    ]),
  };

  // Separation of association by type to process in the right order
  associations.forEach(association =>
    mapper.associationTypes
      .get(association.associationType)
      .items.push(association),
  );

  mapper.associationTypes.forEach(associationType => {
    associationType.items.forEach(association => {
      const modelNames = [
        association.source.name,
        association.through
          ? association.through.model.name
          : association.target.name,
      ];

      const typeMapping = {
        [modelNames[0]]: associationType.typeArrowShapes[0],
        [modelNames[1]]: associationType.typeArrowShapes[1],
      };

      const thisMapping = mappings.filter(
        mapping => mapping[modelNames[0]] && mapping[modelNames[1]],
      );

      if (thisMapping.length === 0) mappings.push(typeMapping);
      else {
        thisMapping[0][modelNames[0]] = typeMapping[modelNames[0]];
        thisMapping[0][modelNames[1]] = typeMapping[modelNames[1]];
      }
    });
  });

  return mappings
    .map(Object.entries)
    .map(
      entries =>
      entries.length == 1
      ? `"${entries[0][0]}" -> "${entries[0][0]}" [arrowtail=${entries[0][1]}, arrowhead=none, dir=both, arrowsize=0.60]`
      : `"${entries[0][0]}" -> "${entries[1][0]}" [arrowtail=${entries[0][1]}, arrowhead=${entries[1][1]}, dir=both, arrowsize=0.60]`,
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

const attributeTemplate = (attribute, i) =>
  `<tr><td port="${i}" align="left">${attribute.fieldName}: ${typeName(
    attribute.type
  )}</td></tr>`;

const modelTemplate = ({ model, columns }) => `"${
  model.name
}" [shape=none, margin=0, label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4">
    <tr><td bgcolor="lightblue">${model.name}</td></tr>
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
  color = 'black',
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
    edge [concentrate=true, color=${color}, penwidth=0.75];
    node[fontsize=10];
    ${columns ? "" : "esep=1;"}
    rankdir=LR;
    ${modelsArr
      .filter(modelFilter)
      .map(model => modelTemplate({ model, columns }))
      .join("\n")}
    ${relationships(associationsArr, arrowShapes).join("\n")}
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
