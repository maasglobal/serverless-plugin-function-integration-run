# serverless-plugin-function-integration-run
Serverless Plugin Function Integration Run - A plugin to run function so that input comes from a specified file and result goes to another specified file

Work is heavily based on the Serverless project "function run" code.

Usage:

    sls function integration-run -s dev -r euwest1 my-function-name path/to/event.json /path/to/output_file
