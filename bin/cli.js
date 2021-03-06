#!/usr/bin/env node

const fs = require('fs');
const yargs = require('yargs');
const processConfigTables = require('../dist').processConfigTables;

const parseJson = jsonstring => {
  try {
    return JSON.parse(jsonstring);
  } catch (err) {
    throw new Error(`Invalid JSON structure. ${err.message}.`);
  }
};

const provisionFromJson = argv => {
  const json = parseJson(argv.jsonstring);
  processConfigTables(json)
    .then(() => {})
    .catch(err => {
      throw err;
    });
};

const provisionFromJsonFile = argv => {
  if (!fs.existsSync(argv.filepath)) {
    throw new Error('Invalid path "' + argv.filepath + '" specified.');
  }
  const content = fs.readFileSync(argv.filepath);
  provisionFromJson({jsonstring: String(content)});
};

yargs
  .usage('$0 <cmd> [args]')
  .command('version', 'Get version number', {}, () => {
    console.log(require('../package.json').version);
  })
  .command('json [jsonstring]', 'Run provisioner based on JSON definition', {}, provisionFromJson)
  .command('jsonfile [filepath]', 'Run provisioner based on JSON file', {}, provisionFromJsonFile)
  .demandCommand(1, 'Provisioner command not specified.')
  .help()
  .argv;
