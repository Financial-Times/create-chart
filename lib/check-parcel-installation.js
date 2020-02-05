/**
 * @file
 * Returns parcel version or false
 */

const execa = require("execa");

module.exports = execa("parcel", ["--version"], {
  shell: true
})
  .then(({ stdout }) => stdout)
  .catch(() => false);
