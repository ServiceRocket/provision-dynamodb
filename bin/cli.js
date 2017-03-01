#!/usr/bin/env node

const fs = require('fs');
const yargs = require('yargs');
const {processConfigTables} = require('../dist');

const parseJson = jsonstring => {
  try {
    return JSON.parse(jsonstring);
  } catch (err) {
    throw new Error(`Invalid JSON structure. ${err.message}.`);
  }
};

const provisionFromJson = ({jsonstring}) => {
  const json = parseJson(jsonstring);
  processConfigTables(json)
    .then(() => {})
    .catch(err => {
      throw err;
    });
};

const provisionFromJsonFile = ({filepath}) => {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Invalid path "${filepath}" specified.`);
  }
  const content = fs.readFileSync(filepath);
  provisionFromJson({jsonstring: String(content)});
};

yargs
  .usage('$0 <cmd> [args]')
  .command('json [jsonstring]', 'Run provisioner based on JSON definition', {}, provisionFromJson)
  .command('jsonfile [filepath]', 'Run provisioner based on JSON file', {}, provisionFromJsonFile)
  .demandCommand(1, 'Provisioner command not specified.')
  .help()
  .argv;
