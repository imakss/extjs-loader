// let Promise = require('bluebird');
import fs from 'fs'
import path from 'path';
import Promise from 'bluebird'
import { parseScript } from 'esprima'
import CommentParser from 'comment-parser'
import colors from 'colors'

const readFile = Promise.promisify(fs.readFile)

import tagParser from './parseTag'

const nameTags = ['define'];
const requireTags = ['require', 'mixins'];
const overrideTags = ['override'];

import esquery from 'esquery'
import util from 'util'

/**
 *
 * @property Array names
 * @property Array requires
 * @property Array override
 */
export default class FileParser {
    constructor(options = {}) {
        this.names = [];
        this.requires = [];
        this.override = "";
        this.filesRequires = {}
        this.files = []
        this.aliases = {}
        this.ignoreOverrides = options.ignoreOverrides || false;
    }


    async parse(src) {
        const content = await this.loadFile(src);
        const AST = this.generateAST(content);
        // console.dir(JSON.stringify(AST, null, 2))
        const comments = await this.extractComments(AST);
        const groupedTags = await this.groupComments(comments);
        const parsedTags = await this.parseTags(groupedTags);
        // console.dir(parsedTags)
        this.extractCode(AST);
    }

    async parseContent(content) {
        // console.log(content)
        const AST = this.generateAST(content);
        // console.dir(JSON.stringify(AST, null, 2))
        const comments = await this.extractComments(AST);
        const groupedTags = await this.groupComments(comments);
        const parsedTags = await this.parseTags(groupedTags);
        // console.dir(parsedTags)
        this.extractCode(AST);
    }

    generateAST(content) {
        // console.dir(Esprima)
        // return Esprima.parse(content.toString(), {
        return parseScript(content.toString(), {
            tolerant: true,
            comment: true,
            tokens: false,
            range: false,
            loc: true,
            jsx: false
        });
    }

    /**
     * Loads a file and returns with the jsDoc comments
     *
     * @param src String
     */
    async loadFile(src) {
        this.src = src;
        const content = await readFile(path.resolve(src));
        return content.toString();
    }

    addAlternateClassName() {
    }

    extractCode(AST) {
        let me = this;
        // let esquery = require('esquery');
        const validDefines = `[expression.callee.object.name = 'Ext'][expression.callee.property.name = define][expression.arguments.0.value!='null']`;

        let requires = {}

        let matches = esquery.match(AST, esquery.parse(validDefines));
        if (matches && matches[0] && matches[0].expression.arguments) {
            me.addName(matches[0].expression.arguments[0].value);
        }

        matches = esquery.match(AST, esquery.parse(`${validDefines} ObjectExpression > Property[key.name=alternateClassName]`));
        if (matches && matches[0] && matches[0].value) {
            let node = matches[0].value;
            if (node.type === "Literal") {
                // me.addName(node.value);
                requires.alternateClassName = [node.value]
            } else if (node.type === "ArrayExpression") {
                requires.alternateClassName = []
                node.elements.forEach((element) => {
                    // me.addName(element.value);
                    requires.alternateClassName.push(element.value)
                });
            }
        }

        matches = esquery.match(AST, esquery.parse('ObjectExpression > Property[key.name=model]'))
        if(matches && matches[0] && matches[0].value) {
            let node = matches[0].value
            if(node.type === 'Literal') {
                requires.model = node.value
            }
        }

        matches = esquery.match(AST, esquery.parse(`ObjectExpression > Property[key.name=controllers]`));
        if (matches && matches[0] && matches[0].value) {
            let node = matches[0].value;
            if (node.type === "Literal") {
                // console.log('controllers', node.value)
                // me.addRequire(node.value);
                requires.controllers = [node.value]
            } else { 
                if (node.type === "ArrayExpression") {
                    // console.dir('controllers' + node.elements.toString())
                    requires.controllers = []
                    node.elements.forEach((element) => {
                        // me.addRequire(element.value);
                        requires.controllers.push(element.value)
                    });
                }
            }
        }
        matches = esquery.match(AST, esquery.parse(`ObjectExpression > Property[key.name=controller]`));
        if (matches && matches[0] && matches[0].value) {
            let node = matches[0].value;
            if (node.type === "Literal") {
                // console.log('controller', node.value)
                // me.addRequire(node.value);
                requires.controller = node.value
            } else { 
                // if (node.type === "ArrayExpression") {
                //     node.elements.forEach((element) => {
                //         me.addRequire(element.value);
                //     });
                // }
            }
        }
        matches = esquery.match(AST, esquery.parse(`ObjectExpression > Property[key.name=requires]`));
        if (matches && matches[0] && matches[0].value) {
            let node = matches[0].value;
            if (node.type === "Literal") {
                // me.addRequire(node.value);
                requires.requires = [node.value]
            } else if (node.type === "ArrayExpression") {
                requires.requires = []
                node.elements.forEach((element) => {
                    // me.addRequire(element.value);
                    requires.requires.push(element.value)
                });
            }
        }
        if (!this.ignoreOverrides) {
            matches = esquery.match(AST, esquery.parse(`${validDefines} ObjectExpression > Property[key.name=override]`));
            if (matches && matches[0] && matches[0].value) {
                let node = matches[0].value;
                if (node.type === "Literal") {
                    // me.addOverride(node.value);
                    me.override = node.value
                } else {
                    //console.log('found alternateClassName but not literal',matches);
                }
            }
        }
        matches = esquery.match(AST, esquery.parse(`ObjectExpression > Property[key.name=extend]`));
        if (matches && matches[0] && matches[0].value) {
            let node = matches[0].value;
            if (node.type === "Literal") {
                // me.addRequire(node.value);
                requires.extend = node.value
            } else {
                //console.log('found alternateClassName but not literal',matches);
            }
        }
        // console.dir(JSON.stringify(esquery.parse(`MemberExpression > Property[key.name=require]`)))
        // matches = esquery.match(AST, esquery.parse(`CallExpression > MemberExpression > .property[name='require']`));//> Property[key.name=Ext] CallExpression > .arguments
        // matches = esquery.match(AST, esquery.parse(`CallExpression[callee.name='require']`))// > Property[key.name=require]
        matches = esquery(AST, 'CallExpression[callee.property.name=\'require\']')
        // console.dir(JSON.stringify(matches))
        // if(this.src === 'app/Application.js') console.dir(JSON.stringify(matches))
        if(matches) {
            matches.forEach(node => {
                node.arguments.forEach(arg => {
                    // console.dir(arg)
                    if(arg.type === 'Literal') {
                        // me.addRequire(arg.value)
                        if(!requires.require) requires.require = []
                        requires.require.push(arg.value)
                    }
                    if(arg.type === 'Identifier') {
                        // console.log(colors.red(arg.name))
                        // console.log(JSON.stringify(AST))
                    }
                })
            })
        }
        if(this.src) {
            requires.file = this.src
            this.filesRequires[this.src] = requires
            this.files.push(this.src)
        } else {
            this.filesRequires['content'] = requires
        }
        // if(this.src === 'app/Application.js')
            // console.dir(requires)
    }

    /**
     * Return an
     *
     * @param AST
     * @returns {Array} Array of comment blocks
     */
    extractComments(AST) {
        return AST.comments.map((comment) => {
            let value = comment.value;
            if (comment.type === 'Line') {
                value = `*${comment.value}`;
            }
            return CommentParser(`/*${value}*/`)[0];
        }).filter(Boolean);
    }

    /**
     * Gathers the tags from comment block and returns with the combined array of tags
     *
     * @param {Object[]} comments Array which contains the extracted comments
     * @param {String} comments[].tags Array of tags
     * @return Promise
     */
    groupComments(comments) {
        return comments.reduce((ret, comment) => [...ret, ...comment.tags], []);
    }

    parseTags(tags) {
        // let tagParser = require('./parseTag');
        tags.forEach((tag) => {
            this.parseTag(new tagParser(tag));
        });
    }

    parseTag(tag) {
        if (tag.tag === "class" && (tag.name === "Ext" || tag.name === "Ext.Widget")) {
            if (this.src.indexOf('Ext.js') == -1) {
                return Promise.resolve();
            }
        }

        if (nameTags.includes(tag.tag)) {
            this.addName(tag.name);
        }
        if (requireTags.includes(tag.tag)) {
            this.addRequire(tag.name);
        }
        if (overrideTags.includes(tag.tag)) {
            this.addOverride(tag.name);
        }
        /* if (tag.tag.indexOf('cmd-auto-dependency') > -1) {
             if (tag.type.defaultType && tag.type.defaultType.indexOf('Ext.') > -1) {
               console.log('Adding defaultType',tag.type.defaultType);
                 this.addRequire(tag.type.defaultType);
             }
         }*/
        return Promise.resolve();
    }

    addName(name) {
        if (name && name != "" && !this.names.includes(name)) {
            this.names.push(name);
        }
    }

    addRequire(require) {
        if (require) {
            this.requires.push(require);
        }
    }

    addOverride(override) {
        if (override) {
            this.override = override;
        }
    }

}