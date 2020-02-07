#!/usr/bin/env node

/**
 * @file
 * CLI tool for scaffolding new Visual Vocabulary charts
 */

const meow = require("meow");
const inquirer = require("inquirer");
const { join, basename } = require("path");
const execa = require("execa");
const chalk = require("chalk");
const fs = require("fs").promises;
const ora = require("ora");
const { homedir } = require("os");
const parcelIsInstalled = require("../lib/check-parcel-installation");
const wrapValue = require("../lib/wrap-value");
const getEditors = require("../lib/detect-editors");
const vvcData = require("../vvc-release-data.json");

const { input, flags, showHelp } = meow(`
      Usage
        $ create-chart <path-to-new-directory> [template type]
`);

(async () => {
  const [dest] = input;
  let [, templateName] = input;
  if (!dest) {
    showHelp(); // ...and exit
  }
  const spinner = ora();
  try {
    // Check for global parcel-bundler installation; install if not
    if (!(await parcelIsInstalled)) {
      spinner.start("Installing parcel-bundler");
      await execa("npm", ["install", "-g", "parcel-bundler"], {
        shell: true
      });
      spinner.succeed("Parcel installation complete");
    }

    // Check for valid .npmrc
    spinner.start("Checking .npmrc status....");
    const npmrc = await fs
      .readFile(join(homedir(), ".npmrc"), "utf-8")
      .catch(() => "");

    if (
      !npmrc.includes("registry=https://npm.pkg.github.com/financial-times")
    ) {
      spinner.warn("No GitHub Package Manager configuration detected");

      // Open browser
      await execa("open", ['"https://github.com/settings/tokens"'], {
        shell: true
      });

      const { token } = await inquirer.prompt({
        message:
          'Please generate a Personal Access Token with scope "read:packages" and paste it here',
        type: "input",
        name: "token"
      });

      const config = `registry=https://npm.pkg.github.com/financial-times
//npm.pkg.github.com/:_authToken=${token}\n`;

      // Write config to home, appending to the start of .npmrc.
      // Comment out existing
      await fs.writeFile(
        join(homedir(), ".npmrc"),
        config +
          npmrc
            .split("\n")
            .map(line => `#${line}`)
            .join("\n")
      );
      spinner.succeed("Wrote ~/.npmrc");
    }

    // Begin scaffolding...
    // First copy base files...
    const src = join(__dirname, "..", "src");

    spinner.start(`Creating directory ${chalk.bold(dest)}`);
    try {
      await fs.mkdir(dest);
      spinner.succeed();
    } catch (e) {
      if (e.errno === -17) {
        spinner.fail(
          chalk.red(`Destination ${chalk.bold(dest)} already exists! Aborting.`)
        );
        process.exit();
      }
    }

    if (!templateName) {
      // Choose template if one not supplied from CLI
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
    const srcPkg = require(join(src, "package.json")); // eslint-disable-line
    srcPkg.dependencies["@financial-times/vvc"] = vvcVersion;
    await fs.writeFile(
      join(dest, "package.json"),
      JSON.stringify(srcPkg, null, "  ")
    );
    spinner.succeed("Copied package.json");

    // Run npm install
    spinner.start("Installing dependencies via npm...");
    const installProcess = await execa("npm", ["install"], {
      cwd: dest,
      shell: true
    });
    const [firstLine] = installProcess.stdout.split("\n"); // Cuts any `npm fund` prompts, etc.
    spinner.succeed(firstLine);

    // Copy and rename .gitignore
    spinner.start("Copying .gitignore");
    await fs.copyFile(join(src, "gitignore"), join(dest, ".gitignore"));
    spinner.succeed();

    // Copy Index
    spinner.start("Copying index.html");
    await fs.copyFile(join(src, "index.html"), join(dest, "index.html"));
    spinner.succeed();

    // Generate index.js from templateName
    // @TODO populate props
    // @TODO populate sample data
    const indexjsTemplate = `/**
 * @file
 * Chart using the ${templateName} template
 */
import { render } from "react-dom";
import React from "react";
import { templates } from "@financial-times/vvc";

const App = () => (
  <templates.${templateName}
${vvcData.templates[templateName].required
  .map(
    p =>
      (vvcData.templates[templateName].defaults[p] &&
        `    ${p}=${wrapValue(vvcData.templates[templateName].defaults[p])}`) ||
      `    ${p}={/* required prop; please add a value */}`
  )
  .filter(i => i)
  .join("\n")}
${vvcData.templates[templateName].optional
  .map(
    p =>
      vvcData.templates[templateName].defaults[p] &&
      `    ${p}=${wrapValue(vvcData.templates[templateName].defaults[p])}`
  )
  .filter(i => i)
  .join("\n")}
  />
);

render(<App />, document.getElementById("root"));`;

    // Write to destination
    spinner.start("Copying index.js");
    await fs.writeFile(join(dest, "index.js"), indexjsTemplate);
    spinner.succeed();
    spinner.stopAndPersist({
      text: "Project ready!",
      symbol: "🆒"
    });

    // Get editor to use
    let scaffolderConfig;
    try {
      scaffolderConfig = JSON.parse(
        await fs.readFile(join(homedir(), ".vvcrc"), "utf-8")
      );
    } catch (e) {
      const editorList = await getEditors();
      const { editor } = await inquirer.prompt({
        message: "Which editor do you use?",
        type: "list",
        choices: editorList.map(({ path }) => basename(path, ".app")),
        name: "editor"
      });

      scaffolderConfig = {
        editor: editorList.find(({ path }) => basename(path, ".app") === editor)
      };

      await fs.writeFile(
        join(homedir(), ".vvcrc"),
        JSON.stringify(scaffolderConfig, null, "\t")
      );
    }

    // Open folder in preferred editor @TODO open index.js instead
    await execa("open", ["-b", scaffolderConfig.editor.bundle, dest], {
      shell: true
    });
    // Open folder in Finder
    await execa("open", [dest], { shell: true });
    // @TODO open new terminal, run Parcel
    // Done!!! Get to work!
  } catch (e) {
    console.error(e);
    spinner.fail(e.message);
  }
})();
