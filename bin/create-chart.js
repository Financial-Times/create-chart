#!/usr/bin/env node

/**
 * @file
 * CLI tool for scaffolding new Visual Vocabulary charts
 */

const meow = require("meow");
const inquirer = require("inquirer");
const { join } = require("path");
const execa = require("execa");
const chalk = require("chalk");
const fs = require("fs").promises;
const ora = require("ora");
const parcelIsInstalled = require("../lib/check-parcel-installation");
const vvcData = require(join(__dirname, "..", "vvc-release-data.json"));

const { input, flags, showHelp } = meow(`
      Usage
        $ create-chart <path-to-new-directory> [template type]
`);

(async () => {
  try {
    const spinner = ora();

    // Check for global parcel-bundler installation; install if not
    if (!(await parcelIsInstalled)) {
      spinner.start("Installing parcel-bundler");
      await execa("npm", ["install", "-g", "parcel-bundler"], { shell: true });
      spinner.succeed("Parcel installation complete");
    }

    // @TODO check for valid .npmrc

    // Begin scaffolding...
    if (Object.keys(flags).length) {
      // Flags logic
    } else {
      // First copy base files...
      const [dest] = input;
      let [, templateName] = input;
      if (!dest) {
        showHelp(); // ...and exit
      }
      const src = join(__dirname, "..", "src");

      spinner.start(`Creating directory ${chalk.bold(dest)}`);
      try {
        await fs.mkdir(dest);
        spinner.succeed();
      } catch (e) {
        if (e.errno === -17) {
          spinner.fail(
            chalk.red(
              `Destination ${chalk.bold(dest)} already exists! Aborting.`
            )
          );
          process.exit();
        }
      }

      if (!templateName) {
        const answer = await inquirer.prompt([
          {
            type: "list",
            name: "templateChoice",
            message: "Please choose a template from the following",
            choices: Object.keys(vvcData.templates)
          }
        ]);
        templateName = answer.templateChoice;
      }

      // Get scaffolder's VVC version, insert that in scaffolded package.json
      const vvcVersion = vvcData.version;
      spinner.start(`Updating package.json to VVC version ${vvcVersion}`);
      const srcPkg = require(join(src, "package.json"));
      srcPkg.dependencies["@financial-times/vvc"] = vvcVersion;
      await fs.writeFile(
        join(dest, "package.json"),
        JSON.stringify(srcPkg, null, "  ")
      );
      spinner.succeed();

      // Copy and rename .gitignore
      spinner.start("Copying .gitignore");
      await fs.copyFile(join(src, "gitignore"), join(dest, ".gitignore"));
      spinner.succeed();

      // Copy Index
      spinner.start("Copying index.html");
      await fs.copyFile(join(src, "index.html"), join(dest, "index.html"));
      spinner.succeed();

      // Run npm install
      spinner.start("Installing dependencies via npm...");
      const installProcess = await execa("npm", ["install"], {
        cwd: dest,
        shell: true
      });
      const [firstLine] = installProcess.stdout.split("\n"); // Cuts any `npm fund` prompts, etc.
      spinner.succeed(firstLine);

      // Generate index.js from templateName
      const indexjsTemplate = `/**
 * @file
 * Chart using the ${templateName} template
 */
import { render } from "react-dom";
import React from "react";
import { templates } from "@financial-times/vvc";
import groupedSampleData from "./grouped-continuous";

const App = () => (
  <templates.${templateName}
    data={groupedSampleData}
    xVariable="var a"
    yVariable="var b"
    sizeVariable="var c"
    colorVariable="group"
    hollowDots={true}
    lineOfRegression={true}
    labelColumn="name"
  />
);

render(<App />, document.getElementById("root"));`;
    }
  } catch (e) {
    spinner.fail(e);
  }
})();
