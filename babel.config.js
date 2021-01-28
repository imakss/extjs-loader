const MIN_BABEL_VERSION = 7;

module.exports = (api) => {
  api.assertVersion(MIN_BABEL_VERSION);
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: '10.13.0',
          },
        },
      ],
    ],
    plugins: ["es6-promise", "@babel/plugin-proposal-class-properties"]
  };
};