import fs, { readdirSync, statSync, open, writeFile, appendFileSync } from 'fs';
import path, { extname, dirname, basename } from 'path';
import colors from 'colors'
import FileParser from './lib/fileParser'

const getFiles = (dir, files_) => {    
    files_ = files_ || [];
    let files = readdirSync(dir);
    for (let i in files) {
        var name = dir + '/' + files[i];
        if (statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            if(extname(name) === '.js')
                files_.push(name);
        }
    }
    return files_;
};

let imports = {};

const createImport = file => {
    const dir = dirname(file),
        mPath = dir.replace(/\//g, "$"),
        module = basename(file, '.js'),
        importModule = `import $${mPath}$${module} from './${dir}/${module}'`

    if(!imports[dir]) imports[dir] = []

    imports[dir].push({
        import: importModule,
        importVar: `$${mPath}$${module}`,
        name: basename(file, '.js')
    });
};

const generate = (files) => {
    const outFile = 'index.js';
    files = files || getFiles('app');
    console.log(`count files: ${files.length}`)
    files.forEach(file => createImport(file))

    open(outFile, 'w', (err) => {
        if(err) throw err;
        console.log('File created');
    });

    const onerror = (err) => {
        if(err) throw err;
    }

    writeFile(outFile, '', onerror);

    const appendImport = imp => appendFileSync(outFile, `${imp.import}\n`, onerror)

    for(var prop in imports) {
        appendFileSync(outFile, `//${prop}\n`, onerror);
        imports[prop].forEach(appendImport);
        appendFileSync(outFile, '\n', onerror);
    }

    appendFileSync(outFile, '\n', onerror);

    let modulePath
    const appendObject = item => appendFileSync(outFile, `${modulePath}.${item.name} = ${item.importVar};\n`, onerror)

    const folders = {}

    const appendObjects = path => {
        const f = path.split('.')
        let obj
        f.forEach(item => {
            obj = obj ? `${obj}.${item}` : `${item}`
            if(!(obj in folders)) {
                folders[obj] = true
                appendFileSync(outFile, `${obj} = {};\n`, onerror)
            }
        })
    }

    appendFileSync(outFile, 'var ', onerror)
    
    var group;
    for(prop in imports) {
        group = imports[prop];
        if(group.length > 0) {
            modulePath = prop.replace(/\//g, ".")
            appendObjects(modulePath)
            group.forEach(appendObject);
            appendFileSync(outFile, '\n', onerror);
        }
    }

    appendFileSync(outFile, '\nexport default app;\n', onerror);
};

// generate();


// import FilePirser from 'fileParser.mjs'

class Loader {
    constructor(options = {}) {
        this.entryModule = 'app.js'
        this.appDir = 'app'
        this.files = []
        this.outFile = 'index.js'
    }

    parseSources () {
        return new Promise((resolve, reject) => {
            let parser = new FileParser({ ignoreOverrides: false })

            this.files = [this.entryModule, ...getFiles(this.appDir)]
            // console.dir(this.files)
            let index = 0

            const fileParse = file => {
                return new Promise((resolve, reject) => {
                    parser.parse(file)
                    .then(() => {
                        resolve(parser)
                    }).catch(e => {
                        console.log(colors.red(`error parse file '${file}'`))
                    })
                })
            }

            const nextFile = () => {
                // console.log(index, files.length)
                if(index >= this.files.length) {
                    console.log(`count files parsed: ${parser.files.length}`)
                    resolve(parser.filesRequires)
                    return null
                }
                let file = this.files[index++]
                try {
                    if (fs.existsSync(file)) {
                        return file
                    }
                } catch(err) {
                    console.dir(err)
                }
                return nextFile()
            }

            const parse = () => {
                let file = nextFile()
                if(!file) return
                fileParse(file)
                    .then(p => {
                        // console.dir(p.filesRequires[file])
                        parse()
                    })
            }

            parse()
        })
    }

    isExtModule = module => /^Ext./.test(module)

    toPath = module => module.replace(/\./g, '/') + '.js'

    existModule = file => fs.existsSync(file)

    buildSourceMap = () => {
        this.parseSources()
        .then(modules => {
            let imports = new Set
            let mmMap = {}

            const build = (module) => {
                // console.dir(module)
                if(imports.has(module.file)) return

                let modulePath
                if(module.extend && !this.isExtModule(module.extend)) {
                    modulePath = this.toPath(module.extend)
                    if(this.existModule(modulePath))
                        build(modules[modulePath])
                    else console.log(colors.red('not found module ', modulePath))
                }
                
                //requires
                if(module.requires && module.requires.length) {
                    module.requires.forEach(m => {
                        // console.log(m)
                        if(this.existModule(this.toPath(m)))
                            build(modules[this.toPath(m)])
                        else console.log(colors.red('not found module ', this.toPath(m)))
                    })
                }
                
                //model
                if(module.model) {
                    if(this.existModule(this.toPath(module.model)))
                        build(modules[this.toPath(module.model)])
                    else console.log(colors.red('not found module', this.toPath(module.model)))
                }

                //controllers
                if(module.controllers && module.controllers.length) {
                    module.controllers.forEach(c => {
                        if(this.existModule(this.toPath(c)))
                            build(modules[this.toPath(c)])
                        else console.log(colors.red('not found module ', this.toPath(c)))
                    })
                }

                //controller

                //import current module
                // if(module.file === 'app/view/objects/Ro.js' || module.file === 'app/view/objects/RoController.js')
                //     console.log(colors.cyan(`add import ${module.file}`))
                // imports.push(module.file)
                imports.add(module.file)
                mmMap[module.file] = true
                // console.log(colors.yellow(module.file))
                
                //require
                if(module.require && module.require.length) {
                    // console.log(colors.blue(module.require))
                    module.require.forEach(r => {
                        if(this.existModule(this.toPath(r)))
                            build(modules[this.toPath(r)])
                        else console.log(colors.red('not found module ', this.toPath(r)))
                    })
                }
            }
            
            build(modules[this.entryModule])
            // var newArray = [...new Set(imports)]
            console.log('Количество: ', imports.size)
            console.dir(imports)
            // console.dir(this.files)
            this.files.forEach(file => {
                if(!(file in mmMap)) {
                    const notFile = colors.magenta(file)
                    console.log(colors.red(`not import file ${notFile}`))
                }
            })

            // generate(newArray)

            this.generate(imports)
        })
    }

    generate = (files) => {
        open(this.outFile, 'w', (err) => {
            if(err) throw err;
            console.log('File created');
        });

        const onerror = (err) => {
            if(err) throw err;
        }

        writeFile(this.outFile, '', onerror);

        const dirs = new Set

        const getImport = (file, cache = false) => {
            const dir = dirname(file),
                mPath = dir.replace(/\//g, "$"),
                module = basename(file, '.js')
            let data = {
                variable: dir === '.' ? `$${module}` : `$${mPath}$${module}`,
                from: dir === '.' ? `'./${module}'` : `'./${dir}/${module}'`,
                file,
                dir,
                module
            }
            // if(dir === '.') return `import $${module} from './${module}'`
            if(cache && dir !== '.') dirs.add(data)
            // return `import $${mPath}$${module} from './${dir}/${module}'`
            return `import ${data.variable} from ${data.from}`
        }

        for(let file of files) {
            const imp = getImport(file, true)
            appendFileSync(this.outFile, `${imp}\n`, onerror)
        }

        const folders = {}

        const appendObjects = path => {
            const f = path.split('/')
            let obj
            f.forEach(item => {
                obj = obj ? `${obj}.${item}` : `${item}`
                if(!(obj in folders)) {
                    folders[obj] = true
                    appendFileSync(this.outFile, `${obj} = {};\n`, onerror)
                }
            })
        }

        appendFileSync(this.outFile, `\nvar ${this.appDir};\n`, onerror)

        for(let d of dirs) {
            appendObjects(d.dir)
        }

        appendFileSync(this.outFile, '\n', onerror)

        for(let d of dirs) {
            // console.dir(d)
            let obj = d.dir.replace(/\//g, ".")
            appendFileSync(this.outFile, `${obj}.${d.module} = ${d.variable}\n`)
        }
    }
}

const loader = new Loader()

loader.buildSourceMap()
