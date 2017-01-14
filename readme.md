# Sequelize ERD

This package takes your sequelize models and produces ERD diagrams of them.

![Example](sample.png)

It should be noted that the implimentation is a bit hacky. Its built on top of [mdaines](https://github.com/mdaines)'s [vis.js](https://github.com/mdaines/viz.js/) which is described as "a hack to put Graphvis on the web." It seems like it was recently taken off NPM, so it isn't included as a dependency but instead in this package.

## Installation

You _don't_ need Graphviz or any non-javascript software to use this. Just

```bash
$ npm install sequelize-erd --save-dev
```

## API

Exported from `sequelize-erd` is a function which takes your models. It can either take the `sequelize` instance or a path to a file to require. The function returns an svg of the models.

## Use as a git hook

We expose a binary for you to use as a npm script. If you want an erd diagram generated in your project folder every time you commit, add this to your package json.

```json
{
  "scripts": {
    "erd": "sequelize-erd --source ./path/to/your/sequelize/instance --destination ./erd.svg"
  },
  "pre-commit": ["erd"]
}
```

The `pre-commit` part works because this package depends on [pre-commit](https://github.com/observing/pre-commit).