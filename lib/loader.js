import fs from 'fs';
import path, { dirname, basename } from 'path'
import colors from 'colors'
import { getOptions } from '@webpack-utilities/loader'
import validate from 'schema-utils';

import FileParser from './fileParser'

// const schema = {
//     type: 'object',
//     properties: {
//         test: {
//             type: 'string'
//         }
//     }
// };

//Парсер файлов написанных с помощью фрэймворка ExtJS
let parser = new FileParser({ ignoreOverrides: false })

//Парсинг файла
const fileParse = file => {
    return new Promise((resolve, reject) => {
        parser.parseContent(file)
        .then(() => {
            resolve(parser)
        }).catch(e => {
            reject(e)
        })
    })
}

//Является ли модулем ExtJS
const isExtModule = module => /^Ext./.test(module)

//Преобразуем модуль формата ExtJS в путь файловой системы
const toPath = (module, options) => {
    let p = module.replace(/\./g, `${path.sep}`) + '.js'
    if(options.pathSrc) 
        p = `${options.pathSrc}${path.sep}${p}`
    return p;
}

//Существует ли файл
const existsFile = file => fs.existsSync(file)

//Функция формирования по полному пути файла информации для дальнейшего использования
const getImport = (file, currentFile) => {
    const dir = dirname(file),
        mPath = dir.replace(/\//g, "$"),
        rDir = path.relative(dirname(currentFile), dir),
        module = basename(file, '.js')
    let data = {
        variable: dir === '.' ? `$${module}` : `$${mPath}$${module}`,
        from: dir === '.' ? `'.${path.sep}${module}'` : (rDir ? `'.${path.sep}${rDir}${path.sep}${module}'` : `'.${path.sep}${module}'`),
        file,
        dir,
        module
    }
    return data
}

const getNamespace = module => {
    const arr = module.split('.')
    if(arr && arr.length) return arr[0]
}

//Главная функция для Webpack - именно она вызывается для обработки исходных кодов
export default function(source, map) {
    const module = {}
    const existsModule = variable => {
        if(variable in module) return true
        module[variable] = true
        return false
    }

    var callback = this.async();
    // console.log(colors.blue('module '), colors.green(this.resourcePath))
    const options = getOptions(this);

    // validate(schema, options, {
    //     name: 'Example Loader',
    //     baseDataPath: 'options'
    // });

    // Apply some transformations to the source...

    let res = ''
    fileParse(source).then((parser) => {
        const deps = parser.filesRequires.content
        if(deps.extend && !isExtModule(deps.extend)) {
            if(getNamespace(deps.extend) == options.namespace) {
                const imp = getImport(toPath(deps.extend, options), this.resourcePath)
                if(!existsModule(imp.variable)) {
                    // res += `import ${imp.variable} from ${imp.from}\n`
                    res += `import ${imp.from}\n`
                }
            }
        }
        //requires
        if(deps.requires && deps.requires.length) {
            deps.requires.forEach(m => {
                const imp = getImport(toPath(m, options), this.resourcePath)
                if(existsFile(toPath(m, options))) {
                    if(!existsModule(imp.variable)) {
                        // res += `import ${imp.variable} from ${imp.from}\n`
                        res += `import ${imp.from}\n`
                    }
                } else console.log(colors.red(`No module found '${toPath(m, options)}' which is required to ${this.resourcePath}`))
            })
        }
        //mixins
        if(deps.mixins && deps.mixins.length) {
            deps.mixins.forEach(m => {
                if(isExtModule(m)) return
                const imp = getImport(toPath(m, options), this.resourcePath)
                if(existsFile(toPath(m, options))) {
                    if(!existsModule(imp.variable)) {
                        // res += `import ${imp.variable} from ${imp.from}\n`
                        res += `import ${imp.from}\n`
                    }
                } else console.log(colors.red(`No module found '${toPath(m, options)}' which is mixins to ${this.resourcePath}`))
            })
        }
        //model
        if(deps.model) {
            if(existsFile(toPath(deps.model, options))) {
                const imp = getImport(toPath(deps.model, options), this.resourcePath)
                if(!existsModule(imp.variable)) {
                    // res += `import ${imp.variable} from ${imp.from}\n`
                    res += `import ${imp.from}\n`
                }
            } else console.log(colors.red('not found module', toPath(deps.model, options)))
        }

        //controllers
        if(deps.controllers && deps.controllers.length) {
            deps.controllers.forEach(c => {
                if(existsFile(toPath(c, options))) {
                    const imp = getImport(toPath(c, options), this.resourcePath)
                    if(!existsModule(imp.variable)) {
                        // res += `import ${imp.variable} from ${imp.from}\n`
                        res += `import ${imp.from}\n`
                    }
                } else console.log(colors.red('not found module ', toPath(c, options)))
            })
        }

        //require
        if(deps.require && deps.require.length) {
            deps.require.forEach(r => {
                if(existsFile(toPath(r, options))) {
                    const imp = getImport(toPath(r, options), this.resourcePath)
                    if(!existsModule(imp.variable)) {
                        // res += `import ${imp.variable} from ${imp.from}\n`
                        res += `import ${imp.from}\n`
                    }
                } else console.log(colors.red('not found module ', toPath(r, options)))
            })
        }
        callback(null, `${res}${source}`, map)
    }).catch(e => {
        callback(e)
    })
}
