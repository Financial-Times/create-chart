#!/usr/bin/env node

/**
 * @file
 * Generates a JSON blob from the latest VVC release
 */

const fs = require("fs").promises;
const vvc = require("@financial-times/vvc");
const path = require("path");
const { version } = require("@financial-times/vvc/package.json");

const data = {
  version,
  templates: Object.entries(vvc.templates).reduce(
    (a, [template, data]) => ({
      ...a,
      [template]: {
        required: Object.keys(data.propTypes || {}).filter(d =>
          data.propTypes[d].hasOwnProperty("isRequired")
        ),
        optional: Object.keys(data.propTypes || {}).filter(
          d => !data.propTypes[d].hasOwnProperty("isRequired")
        ),
        defaults: data.defaultProps
      }
    }),
    {}
  )
};

fs.writeFile(
  path.join(__dirname, "..", "./vvc-release-data.json"),
  JSON.stringify(data, null, "\t")
).catch(console.error);

console.log(`Generating release data for VVC version ${version}`);
