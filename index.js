const Vis = require("./graphvis");
let Sequelize;
const relationship = ({ source, target, associationType, as }) => {
  const typeString = {
    BelongsTo: `[arrowtail=crow, arrowhead=odot, dir=both]`,
    BelongsToMany: `[arrowtail=crow, arrowhead=crow, dir=both, label="${as}"]`
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

const attributeTemplate = attribute =>
  `${attribute.fieldName} :${typeName(attribute.type)}\\l\\`;

const modelTemplate = model => `"${model.name}" [shape=record, label="{${
  model.name
}|\
      ${Object.values(model.attributes)
        .map(attributeTemplate)
        .join("\n")}
    }"]`;

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

module.exports = ({ source, include, omit }) => {
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

  const models = Object.values(modelsObj);

  if (!models.length) {
    console.error(
      `⚠️   Oops! It looks like \`sequelize-erd\` can't see your models. Make sure \`${source}\` exports sequelize *and* requires your models`
    );
    return;
  }
  return Vis(
    `
    digraph models_diagram {
      graph[overlap=false, splines=true]
      ${models.map(modelTemplate).join("\n")}
      ${models
        .map(model =>
          Object.values(model.associations)
            .filter(
              association =>
                !!modelsObj[association.source.name] &&
                !!modelsObj[association.target.name]
            )
            .map(relationship)
            .join("\n")
        )
        .join("\n")}
  }`,
    {
      format: "svg",
      engine: "dot"
    }
  );
};
