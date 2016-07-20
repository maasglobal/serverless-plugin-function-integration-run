'use strict';

module.exports = function ( S ) {

  const path   = require('path');
  const SError     = require(S.getServerlessPath('Error'));
  const SCli       = require(S.getServerlessPath('utils/cli'));
  const SUtils     = S.utils;
  const BbPromise  = require('bluebird');
  const fsp = require('fs-promise');

  class functionIntegrationRun extends S.classes.Plugin {
    registerActions() {
      S.addAction(this.functionIntegrationRun.bind(this), {
        handler: 'functionIntegrationRun',
        description: 'Runs the service locally with file input and file output. Reads the service\'s runtime and passes it off to a runtime-specific runner',
        context: 'function',
        contextAction: 'integration-run',
        options: [
          {
            option: 'region',
            shortcut: 'r',
            description: 'region you want to run your function in',
          },
          {
            option: 'stage',
            shortcut: 's',
            description: 'stage you want to run your function in',
          },

        ],
        parameters: [
          {
            parameter: 'name',
            description: 'The name of the function you want to run',
            position: '0',
          },
          {
            parameter: 'eventFile',
            description: 'The file from which event data is read',
            position: '0',
          },
          {
            parameter: 'resultFile',
            description: 'The file to which the result is written to',
            position: '0',
          },
        ],
      });
      return BbPromise.resolve();
    }

    functionIntegrationRun(evt) {
      this.evt = evt;

      return this._prompt()
        .bind(this)
        .then(this._validateAndPrepare)
        .then(this._runLocal)
        .then(this._writeResultToFile)
        .then(() => this.evt );
    }

    _prompt() {
      if (!S.config.interactive || this.evt.options.stage) return BbPromise.resolve();

      return this.cliPromptSelectStage('Function Run - Choose a stage: ', this.evt.options.stage, false)
        .then(stage => { this.evt.options.stage = stage; } )
        .then(() => this.cliPromptSelectRegion('Select a region: ', false, true, this.evt.options.region, this.evt.options.stage) )
        .then(region => { this.evt.options.region = region; });
    }

    _validateAndPrepare() {

      // If CLI and path is not specified, deploy from CWD if Function
      if (S.cli && !this.evt.options.name) {
        // Get all functions in CWD
        if (!SUtils.fileExistsSync(path.join(process.cwd(), 's-function.json'))) {
          return BbPromise.reject(new SError('You must be in a function folder to run it'));
        }
        this.evt.options.name = SUtils.readFileSync(path.join(process.cwd(), 's-function.json')).name;
      }

      this.function = S.getProject().getFunction(this.evt.options.name);

      // Missing function
      if (!this.function) return BbPromise.reject(new SError(`Function ${this.evt.options.name} does not exist in your project.`));

      // load event data if not it not present already
      if (this.evt.data.event) return BbPromise.resolve();

      return fsp.readFile(this.evt.options.eventFile, { encoding: 'utf8' } )
        .then(event => { this.evt.data.event = JSON.parse(event); } );
    }

    _writeResultToFile() {
      return fsp.writeFile(this.evt.options.resultFile, JSON.stringify(this.evt.data.result) );
    }

    _runLocal() {
      const name = this.evt.options.name;
      const stage = this.evt.options.stage;
      const region = this.evt.options.region;
      const event = this.evt.data.event;

      if (!name) return BbPromise.reject(new SError('Please provide a function name to run'));

      SCli.log(`Running ${name}...`);

      return this.function.run(stage, region, event)
        .then(result => { this.evt.data.result = result; } );
    }
  }

  return ( functionIntegrationRun );
};
