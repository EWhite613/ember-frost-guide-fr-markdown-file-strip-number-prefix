/* globals module */
/* jshint node: true */

'use strict';

var Flatiron = require('broccoli-flatiron');
var fs = require('fs');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var path = require('path');
var mkdirp = require("mkdirp");

Flatiron.prototype.write = function (readTree, destDir) {
  var _this = this;

  return readTree(this.inputTree).then(function (srcDir) {
    var obj = readDirectory(srcDir),
      output;

    function readDirectory(srcDir) {
      var obj = {},
        entries = fs.readdirSync(srcDir);

      Array.prototype.forEach.call(entries, function (entry) {
        if (fs.lstatSync(path.join(srcDir, entry)).isDirectory()) {
          obj[entry] = readDirectory(path.join(srcDir, entry));
        } else {
          var content = fs.readFileSync(path.join(srcDir, entry), {
            encoding: "utf8"
          });
          if (process.env.external) {
            content = content.replace(/<private>[ |\n|\t|\w|<|=|\/|\>.|\-|\.|\"|\"]+<\/private>/ig, "");
            if (content.indexOf("<private>") > -1) {
              content = 'aborted \n content still contained private tag after regex'
            }
          }

          obj[_this.options.trimExtensions ? entry.split(".")[0] : entry] = content
        }
      });

      return obj;
    }

    output = "export default " + JSON.stringify(obj, null, 2);
    console.log(output)
    mkdirp.sync(path.join(destDir, path.dirname(_this.options.outputFile)));
    fs.writeFileSync(path.join(destDir, _this.options.outputFile), output);
  });
}


module.exports = {
  name: 'ember-frost-guide-fr-markdown-file-strip-number-prefix',

  included: function (app) {
    this._super.included(app);
  },

  treeForAddon: function (tree) {
    var mdPaths = [];

    if (this.project.name() !== 'ember-frost-guide-fr-markdown-file-strip-number-prefix') {
      var appMdRoot = path.join(this.project.root, 'markdown');
      if (fs.existsSync(appMdRoot)) {
        mdPaths.push(appMdRoot);
      }
    }

    var dummyMdRoot = path.join(this.project.root, 'tests', 'dummy', 'markdown');
    if (fs.existsSync(dummyMdRoot)) {
      mdPaths.push(dummyMdRoot);
    }

    if (mdPaths.length > 0) {
      var mdFunnel = new Funnel(mergeTrees(mdPaths), {
        include: [new RegExp(/\.md/)]
      });


      var mdFlattened = Flatiron(mdFunnel, {
        outputFile: 'markdownFiles.js',
        trimExtensions: true
      });
      tree = mergeTrees([tree, mdFlattened]);
    }

    return this._super.treeForAddon.call(this, tree);
  }
};
