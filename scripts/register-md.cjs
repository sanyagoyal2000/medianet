// Lets tsx scripts import *.md prompt files as strings (Next uses a webpack asset/source rule).
const fs = require("node:fs");
require.extensions[".md"] = (module, filename) => {
  module.exports = { __esModule: true, default: fs.readFileSync(filename, "utf8") };
};
