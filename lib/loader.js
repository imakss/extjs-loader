import fs from 'fs';
import path, { dirname, basename } from 'path'
// const path = require('path')
// const colors = require('colors')
import colors from 'colors'

// const loaderUtils = require('loader-utils')
// const validate = require('schema-utils')
import { getOptions } from 'loader-utils';
import validate from 'schema-utils';

// const FileParser = require('../../fileParser')

import FileParser from './fileParser'

const schema = {
    type: 'object',
    properties: {
        test: {
            type: 'string'
        }
    }
};

let parser = new FileParser({ ignoreOverrides: false })

const fileParse = file => {
    return new Promise((resolve, reject) => {
        parser.parseContent(file)
        .then(() => {
            resolve(parser)
        }).catch(e => {
            console.dir(e)
            console.log('!!!', colors.red(`error parse file '${file}'`))
        })
    })
}

const isExtModule = module => /^Ext./.test(module)

const toPath = module => module.replace(/\./g, '/') + '.js'

const existModule = file => fs.existsSync(file)

const folders = {}
let first = true

const appendObjects = path => {
    const f = path.split('.')
    let obj, res = ''
    f.forEach(item => {
        obj = obj ? `${obj}.${item}` : `${item}`
        if(!(obj in folders)) {
            folders[obj] = true
            if(first) {
                res += 'var '
            }
            res += `${obj} = {};\n`
            // if(first) {
            //     res += `console.dir('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');`
            // }
            first = false
        }
    })
    return res
}

const getImport = (file, currentFile, cache = false) => {
    const dir = dirname(file),
        mPath = dir.replace(/\//g, "$"),
        rDir = path.relative(dirname(currentFile), dir),
        module = basename(file, '.js')
        // console.log(colors.cyan(`'${rDir}'`))
    let data = {
        variable: dir === '.' ? `$${module}` : `$${mPath}$${module}`,
        from: dir === '.' ? `'./${module}'` : (rDir ? `'./${rDir}/${module}'` : `'./${module}'`),
        file,
        dir,
        module
    }
    // console.log(currentFile, colors.yellow(`${data.from}`))
    // if(dir === '.') return `import $${module} from './${module}'`
    // if(cache && dir !== '.') dirs.add(data)
    // return `import $${mPath}$${module} from './${dir}/${module}'`
    // return `import ${data.variable} from ${data.from}`
    return data
}

// let modules = []

// const existsModule = variable => {
//     if(variable in module) return true
//     module[variable] = true
//     return false
// }

export default function(source) {
    let module = {}
    const existsModule = variable => {
        if(variable in module) return true
        module[variable] = true
        return false
}

    var callback = this.async();
    // console.log(colors.blue('module '), colors.green(this.resourcePath))
    const options = getOptions(this);

    validate(schema, options, {
        name: 'Example Loader',
        baseDataPath: 'options'
    });

    // Apply some transformations to the source...

    let res = '', obj = ''
    // if(this.testData) console.dir(this.testData)
    // this.data.test = '100500'
    fileParse(source).then((parser) => {
        const deps = parser.filesRequires.content
        // console.dir(deps)
        // console.log(deps.extend)
        if(deps.extend && !isExtModule(deps.extend)) {
            const imp = getImport(toPath(deps.extend), this.resourcePath)
            if(!existsModule(imp.variable)) {
                res += `import ${imp.variable} from ${imp.from}\n`
                // let objm = imp.dir.replace(/\//g, ".")
                obj += `${appendObjects(deps.extend)}${imp.dir.replace(/\//g, ".")}.${imp.module} = ${imp.variable}\n`
                // obj += `${objm}.${imp.module} = ${imp.variable}\n`
            }
        }
        //requires
        // console.dir(deps.requires)
        if(deps.requires && deps.requires.length) {
            deps.requires.forEach(m => {
                // console.log(m)
                const imp = getImport(toPath(m), this.resourcePath)
                if(existModule(toPath(m))) {
                    // build(modules[this.toPath(m)])
                    if(!existsModule(imp.variable)) {
                        res += `import ${imp.variable} from ${imp.from}\n`
                        // let objm = imp.dir.replace(/\//g, ".")
                        obj += `${appendObjects(m)}${imp.dir.replace(/\//g, ".")}.${imp.module} = ${imp.variable}\n`
                        // obj += `${objm}.${imp.module} = ${imp.variable}\n`
                    }
                } else console.log(colors.red('not found module ', toPath(m)))
            })
        }
        //model
        if(deps.model) {
            if(existModule(toPath(deps.model))) {
                const imp = getImport(toPath(deps.model), this.resourcePath)
                if(!existsModule(imp.variable)) {
                    res += `import ${imp.variable} from ${imp.from}\n`
                    // let objm = imp.dir.replace(/\//g, ".")
                    obj += `${appendObjects(deps.model)}${imp.dir.replace(/\//g, ".")}.${imp.module} = ${imp.variable}\n`
                    // obj += `${objm}.${imp.module} = ${imp.variable}\n`
                }
                // build(modules[this.toPath(parser.model)])
            } else console.log(colors.red('not found module', toPath(deps.model)))
        }

        //controllers
        if(deps.controllers && deps.controllers.length) {
            deps.controllers.forEach(c => {
                if(existModule(toPath(c))) {
                    // build(modules[toPath(c)])
                    const imp = getImport(toPath(c), this.resourcePath)
                    if(!existsModule(imp.variable)) {
                        res += `import ${imp.variable} from ${imp.from}\n`
                        // let objm = imp.dir.replace(/\//g, ".")
                        obj += `${appendObjects(c)}${imp.dir.replace(/\//g, ".")}.${imp.module} = ${imp.variable}\n`
                        // obj += `${imp.dir.replace(/\//g, ".")}.${imp.module} = ${imp.variable}\n`
                    }
                } else console.log(colors.red('not found module ', toPath(c)))
            })
        }

        // console.log(`${res}${obj}`)

        // callback(null, `${res}\n\n${obj}\n\n export default ${ JSON.stringify(source) };`)
        // const dir = dirname(this.resourcePath).replace(/\//g, ".")
        // const name = basename(this.resourcePath, '.js')
        // console.log(colors.cyan(this.rootContext))
        // console.log(colors.cyan(this.resourcePath, this.rootContext, this.resourcePath.replace(`${this.rootContext}${path.sep}`, '')))
        const modulePath = this.resourcePath.replace(`${this.rootContext}${path.sep}`, '')
        const moduleName = basename(modulePath, '.js')
        let moduleDir = dirname(modulePath)
        if(moduleDir === '.') moduleDir = ''
        moduleDir = moduleDir.replace(/\//g, ".")

        // console.log(colors.cyan(`${moduleDir.replace(/\//g, '.')}.${moduleName}`))
        const moduleVariant = moduleDir.length === 0 ? `${moduleName}` : `${moduleDir}.${moduleName}`
        // console.log(colors.blue(`export default ${moduleVariant}`))

        // console.log(`${obj}\n\n\n\n\n\nexport default ${moduleVariant};\n\n${res}\n\n${source}\n`)

        // callback(null, `${obj}\n\n\n\n\n\nexport default ${moduleVariant};\n\n${res}\n\n${source}\n`)
        // console.log(`${res}`)
        callback(null, `${res}\n\n${source}\n`)
    })

    // return `${res}${source}`

    // if(this.resourcePath === '/home/maks/work/projects/piur/sisr/app.js')
    //     return `import $app$Application from './app/Application'\n${ JSON.stringify(source) }`
    // return `${ JSON.stringify(source) }`
    // return `export default ${ JSON.stringify(source) }`;
}
