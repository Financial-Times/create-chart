/**
 * @file
 * Checks for existence of popular text editors and returns the bundle identifer
 */

const execa = require("execa");

const bundleIdentifiers = [
  "com.microsoft.VSCode",
  "com.github.atom",
  "com.sublimetext.3",
  "com.sublimetext.2"
];

const getEditors = () =>
  Promise.all(
    bundleIdentifiers.map(bundle =>
      execa("mdfind", ["kMDItemCFBundleIdentifier", "=", `"${bundle}"`], {
        shell: true
      }).then(({ stdout }) => (stdout && { bundle, path: stdout }) || false)
    )
  ).then(items => items.filter(i => i));

module.exports = getEditors;
