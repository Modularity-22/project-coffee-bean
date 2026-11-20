// Extends app.json. When the web app is exported for a host that serves it from
// a sub-folder, such as GitHub Pages (https://<owner>.github.io/<repo>/),
// EXPO_BASE_URL gives that folder, for example "/project-coffee-bean".
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
