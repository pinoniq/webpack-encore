/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

'use strict';

const inquirer = require('inquirer');
const fs = require('fs');
const PrettyError = require('pretty-error');

const jsTypeVanilla = 'JS_TYPE_VANILLA';
const jsTypeReact = 'JS_TYPE_REACT';
const jsTypeVue = 'JS_TYPE_VUE';

const cssTypeCss = 'CSS_TYPE_CSS';
const cssTypeSass = 'CSS_TYPE_SASS';
const cssTypeLess = 'CSS_TYPE_LESS';

function writeFile(path, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, content, (writeError) => {
            if (writeError) {
                return reject(writeError);
            }

            resolve();
        });
    });
}

function writeFileSafe(path, content) {
    return new Promise((resolve, reject) => {
        fs.stat('postcss.config.js', (err) => {
            if (!err) {
                inquirer.prompt({
                    type: 'confirm',
                    name: 'overwriteFile',
                    message: `The file "${path}" already exists, do you want to overwrite it?`,
                    default: false
                }).then((answers) => {
                    if (!answers.overwriteFile) {
                        // Don't overwrite the current file and keep going
                        return resolve();
                    }

                    writeFile(path, content).then(resolve, reject);
                });
            } else {
                writeFile(path, content).then(resolve, reject);
            }
        });
    });
}

function askIsSPA() {
    const spaType = 'TYPE_SPA';
    const multiType = 'TYPE_MULTI';

    return inquirer.prompt({
        type: 'list',
        message: 'What type of app are you creating?',
        name: 'appType',
        choices: [
            {
                name: 'A) Single Page Application (SPA)',
                value: spaType
            },
            {
                name: 'B) Traditional multi-page app',
                value: multiType
            }
        ]
    }).then((response) => {
        return response.appType === spaType;
    });
}

function askJavaScriptType() {
    return inquirer.prompt({
        type: 'list',
        message: 'What type of JavaScript app do you want?',
        name: 'jsType',
        choices: [
            {
                name: 'A) Vanilla JavaScript',
                value: jsTypeVanilla
            },
            {
                name: 'B) React',
                value: jsTypeReact
            },
            {
                name: 'C) Vue.js',
                value: jsTypeVue
            }
        ]
    }).then((response) => {
        return response.jsType;
    });
}

function askCssType() {
    return inquirer.prompt({
        type: 'list',
        message: 'What type of CSS do you like?',
        name: 'cssType',
        choices: [
            {
                name: 'A) Sass',
                value: cssTypeSass
            },
            {
                name: 'B) LESS',
                value: cssTypeLess
            },
            {
                name: 'C) Vanilla CSS',
                value: cssTypeCss
            }
        ]
    }).then((response) => {
        return response.cssType;
    });
}

function createWebpackConfig(appConfig) {
    // TODO Ask the user for the output and public paths
    const outputPath = 'build/';
    const publicPath = '/';

    let webpackConfig = `// webpack.config.js
const Encore = require('@symfony/webpack-encore');

Encore
  // directory where all compiled assets will be stored
  .setOutputPath('${outputPath}')

  // what's the public path to this directory (relative to your project's document root dir)
  .setPublicPath('${publicPath}')

  // empty the outputPath dir before each build
  .cleanupOutputBeforeBuild()

  // enable support for PostCSS (https://github.com/postcss/postcss)
  .enablePostCssLoader()
`;

    // Add loader/preset based on the selected JS app type
    if (appConfig.jsType === jsTypeReact) {
        webpackConfig += `
  // enable React preset in order to support JSX
  .enableReactPreset()
`;
    }

    if (appConfig.jsType === jsTypeVue) {
        webpackConfig += `
  // enable Vue.js loader
  .enableVueLoader()
`;
    }

    // Add loader based on the selected CSS language
    if (appConfig.cssType === cssTypeSass) {
        webpackConfig += `
  // enable support for Sass stylesheets
  .enableSassLoader()
`;
    }

    if (appConfig.cssType === cssTypeLess) {
        webpackConfig += `
  // enable support for Less stylesheets
  .enableLessLoader()
`;
    }

    webpackConfig += `;

// export the final configuration
module.exports = Encore.getWebpackConfig();
`;

    return writeFileSafe('webpack.config.js', webpackConfig);
}

function addPackages(appConfig) {
    return new Promise((resolve) => {
        // TODO Call "yarn add" and "yarn add --dev" using appConfig values
        resolve();
    });
}

function updatePackageJson() {
    return new Promise((resolve, reject) => {
        fs.readFile('package.json', (readError, data) => {
            if (readError) {
                return reject(readError);
            }

            try {
                const packageContent = JSON.parse(data);

                if (!packageContent.scripts) {
                    packageContent.scripts = {};
                }

                packageContent.scripts['encore:dev'] = 'yarn run encore dev';
                packageContent.scripts['encore:watch'] = 'yarn run encore dev-server';
                packageContent.scripts['encore:production'] = 'yarn run encore production';

                // Write updated package.json content
                writeFile('package.json', JSON.stringify(packageContent, null, 2)).then(resolve, reject);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
}

function createPostCssConfig() {
    const postCssConfig = `// postcss.config.js
module.exports = {
  plugins: {
    'autoprefixer': {},
  }
};
`;

    return writeFileSafe('postcss.config.js', postCssConfig);
}

function generateApp(appConfig) {
    /*
     * Tasks:
     *      A) Create the webpack.config.js file with some
     *          varied options based on their choices
     *              (fail early if this file exists?)
     *      B) yarn add XXX --dev all the packages they will need
     *      C) Add "scripts" to their package.json file
     *          encore:dev
     *          encore:watch
     *          encore:production
     *      D) Add .postcss config file
     *      E) Add node_modules to .gitignore (if that file exists)
     *      F) Generate a mini-app, which will be vanilla JS,
     *          React or Vue.js depending on their choice. This
     *          would be their one entry
     *      G) Give them a message about what to do next
     *
     */

    console.log(appConfig);
    createWebpackConfig(appConfig)
        .then(() => addPackages(appConfig))
        .then(() => updatePackageJson())
        .then(() => createPostCssConfig())
        .then(() => console.log('Success!'))
        .catch((error) => {
            const pe = new PrettyError();
            console.log(pe.render(error));
        });
}

function runInit() {
    const appConfig = {
        isSpa: null,
        jsType: null,
        cssType: null
    };

    askIsSPA().then(isSpa => {
        appConfig.isSpa = isSpa;
        if (isSpa) {
            askJavaScriptType().then(jsType => {
                appConfig.jsType = jsType;

                askCssType().then(cssType => {
                    appConfig.cssType = cssType;

                    generateApp(appConfig);
                });
            });
        } else {
            // for multi-page apps, the main shared entry
            // will always be vanilla JS
            appConfig.jsType = jsTypeVanilla;

            askCssType().then(cssType => {
                appConfig.cssType = cssType;

                generateApp(appConfig);
            });
        }
    });
}

module.exports = function(runtimeConfig) {
    switch (runtimeConfig.command) {
        case 'init':
            runInit();
            break;
        default:
            throw new Error(`Unknown generator command ${runtimeConfig.comma}.`);
    }
};