const fs = require("fs");
const path = require("path");

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
);

module.exports = function (Handlebars) {
  console.log(Handlebars);
  Handlebars.registerHelper("pkgRepoUrl", () => {
    let url = (pkg.repository && pkg.repository.url) || "";
    return url.replace(/\.git$/, "");
  });
  Handlebars.registerHelper("pkgVersion", () => {
    return pkg.version;
  });
  Handlebars.registerHelper("pkgName", () => {
    return pkg.name;
  });
  Handlebars.registerHelper("pkgDescription", () => {
    return pkg.description;
  });

  Handlebars.registerHelper("stringify", function (context) {
    // pretty-print with 2-space indent, and mark as SafeString so HTML shows it
    return new Handlebars.SafeString(
      `[ [${context.commit.shorthash}](${pkg.repository.url}/commit/${context.commit.hash}) ] - ${context.commit.subject} [BWS-${context.fixes[0].id}](${context.fixes[0].href})`
    );
  });
};
