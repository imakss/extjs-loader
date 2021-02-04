import path, { dirname, basename } from 'path'

export default function(source) {
    var callback = this.async();
    // console.log(source)
    const modulePath = this.resourcePath.replace(`${this.rootContext}${path.sep}`, '')
    const moduleName = basename(modulePath, '.js')
    let moduleDir = dirname(modulePath)
    if(moduleDir === '.') moduleDir = ''
    moduleDir = moduleDir.replace(/\//g, ".")

    // console.log(colors.cyan(`${moduleDir.replace(/\//g, '.')}.${moduleName}`))
    const moduleVariant = moduleDir.length === 0 ? `${moduleName}` : `${moduleDir}.${moduleName}`
    // let exp = ''
    // moduleVariant.split('.').forEach(value => {

    // })
    // let obj = 'if(!app) var app = {};'
    let obj = null
    let prev = ''
    // console.log(`${moduleVariant}`)
    moduleVariant.split('.').forEach((value) => {
        // console.log(`${value}    ${prev}`)
        if(!obj) {
            obj = `if(!window.${value}) window.${value} = {};\n`
            prev = `${value}`
        } else {
            obj += `if(!${prev}.${value}) ${prev}.${value} = {};\n`
            prev += `.${value}`
        }
    })
    // console.log(`${obj}`)
    // console.log(`${obj}\n\nexport default ${moduleVariant};\n\n${JSON.stringify(source)}`)
    if(this.resourcePath === '/home/maks/work/projects/piur/sisr/app/structs/Constants.js')
        console.log(`${obj}\n\nexport default ${moduleVariant};\n\n${source}`)
    // console.log(this.resourcePath)
    callback(null, `${obj}\n\n\n\n${source}`)//export default ${moduleVariant};
}