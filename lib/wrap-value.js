/**
 * @file
 * Checks the type of a variable, wraps appropriately
 */

const wrapValue = (value, indent = 4) => {
  switch (typeof value) {
    case "boolean":
    case "number":
    case "function":
      return `{${value}}`;
    case "string":
      return `"${value}"`;
    case "object":
    default:
      // I am so sorry for this. -Æ.
      return Array.isArray(value)
        ? `{[
${`${value
  .map(
    d =>
      Array(indent)
        .fill(" ")
        .join("") + JSON.stringify(d, null, "  ")
  )
  .join("\n")}\n${Array(indent)
  .fill(" ")
  .join("")}`}]}`
        : `{{
${JSON.stringify(value, null, "  ")
  .split("\n")
  .slice(1, -1)
  .map(
    line =>
      Array(indent)
        .fill(" ")
        .join("") + line
  )
  .join("\n")}
${Array(indent)
  .fill(" ")
  .join("")}}}`;
  }
};

module.exports = wrapValue;
