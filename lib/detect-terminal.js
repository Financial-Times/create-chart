/**
 * @file
 * Detects whether iTerm 2 is in use or not
 */

const execa = require("execa");

const bundleIdentifiers = ["com.googlecode.iterm2", "com.apple.Terminal"];

const getTerminals = () =>
  Promise.all(
    bundleIdentifiers.map(bundle =>
      execa("mdfind", ["kMDItemCFBundleIdentifier", "=", `"${bundle}"`], {
        shell: true
      }).then(({ stdout }) => (stdout && { bundle, path: stdout }) || false)
    )
  ).then(items => items.filter(i => i));

module.exports = getTerminals;
