const Vis = require("./graphvis");
const { Module, render } = require("./visRenderer");

let Sequelize;
const relationship = ({ source, target, associationType, as }) => {
  const typeString = {
    BelongsTo: `[arrowtail=crow, arrowhead=none, dir=both, arrowsize=0.60]`,
    BelongsToMany: `[arrowtail=crow, arrowhead=crow, dir=both, arrowsize=0.60]`
  }[associationType];
  if (typeString) {
    return `"${source.name}" -> "${target.name}" ${typeString}`;
  }
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
        ? Object.values(model.attributes)
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

function generateDot({ models, associations, columns = true }) {
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
    graph [pad="0.5", nodesep="1", ranksep="2", overlap="false"];
    edge [concentrate=true, color=gray76, penwidth=0.75];
    node[fontsize=10];
    ${columns ? "" : "esep=1;"}
    rankdir=LR;
    ${modelsArr
      .filter(modelFilter)
      .map(model => modelTemplate({ model, columns }))
      .join("\n")}
    ${modelsArr
      .map(model =>
        Object.values(model.associations)
          .filter(
            association =>
              !!models[association.source.name] &&
              !!models[association.target.name] &&
              matchesAssociation(association)
          )
          .map(relationship)
          .join("\n")
      )
      .join("\n")}
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
