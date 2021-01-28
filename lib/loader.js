import path from 'path'
// const path = require('path')
// const colors = require('colors')
import colors from 'colors'

// const loaderUtils = require('loader-utils')
// const validate = require('schema-utils')
import { getOptions } from 'loader-utils';
import { validate } from 'schema-utils';

// const FileParser = require('../../fileParser')

import FileParser from './fileParser.js'

const schema = {
    type: 'object',
    properties: {
        test: {
            type: 'string'
        }
    }
};

export default function(source) {
    console.log(colors.blue('module '), colors.green(this.resourcePath))
    const options = loaderUtils.getOptions(this);

    validate(schema, options, {
        name: 'Example Loader',
        baseDataPath: 'options'
    });

    // Apply some transformations to the source...

    if(this.resourcePath === '/home/maks/work/projects/piur/sisr/app.js')
        return `import $app$Application from './app/Application'\n${ JSON.stringify(source) }`
    return `${ JSON.stringify(source) }`
    // return `export default ${ JSON.stringify(source) }`;
}
