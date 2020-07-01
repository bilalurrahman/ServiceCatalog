const pkg = require('./package');
const format = require('string-template');
const del = require('del');
const merge = require('merge-stream');
const path = require('path');
const fs = require('fs');
const browserSync = require('browser-sync');
const named = require('vinyl-named');
const webpack = require('webpack-stream');
const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const gulpConfig = (() => {
    // template variable
    function template(variable, vars) {
        if (variable !== null && typeof variable === 'object' || Array.isArray(variable)) {
            Object.keys(variable).forEach((k) => {
                variable[k] = template(variable[k], vars);
            });
        }
        if (typeof variable === 'string') {
            variable = format(variable, vars);
        }
        return variable;
    }
    return template(pkg.gulp_config, pkg.gulp_config.variables);
})();

// run streams for each of theme items (theme and plugins)
function runStream(arr, func) {
    const streams = merge();

    for (let k = 0; k < arr.length; k++) {
        streams.add(func(arr[k]));
    }

    return streams.isEmpty() ? null : streams;
}

/**
 * Get Header Comment
 * @param type
 */
function getHeaderComment(type = 'css') {
    let string = `/*!-----------------------------------------------------------------
    Name: ${pkg.title} - ${pkg.description}
    Version: ${pkg.version}
    Author: ${pkg.author}
    Website: ${pkg.website}
    Purchase: ${pkg.purchase}
    Support: ${pkg.support}
    License: ${pkg.license}
    Copyright ${new Date().getFullYear()}.
-------------------------------------------------------------------*/
    `;

    // change css header comment to html comment
    if (type === 'html') {
        string = string.replace(/\* /g, ' ')
            .replace(/\/\*!-----------------------------------------------------------------/g, '<!--')
            .replace(/-------------------------------------------------------------------\*\//g, '-->');
    }

    return string;
}

/**
 * Error Handler for gulp-plumber
 */
function errorHandler(err) {
    console.error(err);
    this.emit('end');
}


/**
 * Clean Task
 */
gulp.task('clean', (cb) => {
    del(gulpConfig.variables.dist).then(() => {
        cb();
    });
});


/**
 * BrowserSync Task
 */
gulp.task('browserSyncTask', () => {
    $.connectPhp.server(gulpConfig.php, () => {
        browserSync(gulpConfig.browserSync);
    });
});


/**
 * HTML Task
 */
gulp.task('html', () => {
    // get data for nunjucks templates
    function getData(file) {
        const data = JSON.parse(fs.readFileSync(gulpConfig.html.dataFile, 'utf8'));
        data.file = file;
        data.ENV = process.env.NODE_ENV;
        data.filename = path.basename(file.path);
        data.headerComment = getHeaderComment('html');

        // active menu item for menu
        data.isActiveMenuItem = function (itemFile, item, filename) {
            if (itemFile === filename || (item.sub && item.sub[filename])) {
                return true;
            }

            let returnVal = false;

            if (item.sub) {
                Object.keys(item.sub).forEach((fileSub) => {
                    const itemSub = item.sub[fileSub];

                    if (fileSub === filename || (itemSub.sub && itemSub.sub[filename])) {
                        returnVal = true;
                    }
                });
            }

            return returnVal;
        };

        return data;
    }

    return gulp.src(gulpConfig.html.from)
        .pipe($.if(process.env.NODE_ENV === 'dev', $.plumber({ errorHandler })))
        .pipe($.data(getData))
        .pipe($.nunjucksRender({
            path: gulpConfig.html.renderPath,
            envOptions: {
                watch: false,
            },
        }))
        .pipe(gulp.dest(gulpConfig.html.to))
        .on('end', () => {
            browserSync.reload();
        });
});


/**
 * Generate CSS Comments for Envato Rules.
 * @param cont
 * @returns {*}
 */
function generateCSSComments(cont) {
    const templateStart = '{{table_of_contents}}';
    const isset = cont.indexOf(templateStart);
    if (isset > -1) {
        const rest = cont.substring(isset);
        const reg = /\/\*-[-]*?\n([\s\S]*?)\n[ -]*?-\*\//g;
        let titles = reg.exec(rest);
        let i = 1;
        let result = '';
        while (titles !== null) {
            if (titles[1]) {
                const isSub = !/\n/.test(titles[1]);
                const str = titles[1].replace(/^\s+|\s+$/g, '');
                if (!isSub) {
                    result += `\n  ${i}. `;
                    i++;
                } else {
                    result += '\n    - ';
                }
                result += str;
            }
            titles = reg.exec(rest);
        }

        cont = cont.replace(templateStart, result);
    }
    return cont;
}


/**
 * CSS Task
 */
gulp.task('css', () => (
    gulp.src(gulpConfig.css.from)
        .pipe($.if(process.env.NODE_ENV === 'dev', $.plumber({ errorHandler })))
        .pipe($.sass(gulpConfig.css.sass))
        .pipe($.autoprefixer(gulpConfig.css.autoprefixer))
        .pipe($.modifyFile(generateCSSComments))
        .pipe($.header(getHeaderComment()))
        .pipe($.if(process.env.NODE_ENV !== 'deploy', gulp.dest(gulpConfig.css.to)))
        .pipe(browserSync.stream())
        .pipe($.if(process.env.NODE_ENV !== 'dev', $.cleanCss()))
        .pipe($.rename({
            extname: '.min.css',
        }))
        .pipe(gulp.dest(gulpConfig.css.to))
));


/**
 * JS Task
 */
gulp.task('js', () => (
    gulp.src(gulpConfig.js.from)
        .pipe($.plumber({ errorHandler }))
        .pipe(named())
        .pipe(webpack({
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        use: [{
                            loader: 'babel-loader',
                        }],
                    },
                ],
            },
        }))
        .pipe($.if(process.env.NODE_ENV === 'deploy', $.javascriptObfuscator({
            compact: true,
            stringArrayEncoding: 'base64',
            stringArrayThreshold: 1,
        })))
        .pipe($.if(file => !file.path.match(/-init.js$/), $.header(getHeaderComment())))
        .pipe($.if(file => process.env.NODE_ENV !== 'deploy' && !file.path.match(/-init.js$/), gulp.dest(gulpConfig.js.to)))
        .pipe($.if(file => process.env.NODE_ENV !== 'dev' && !file.path.match(/-init.js$/), $.uglify()))
        .pipe($.if(file => !file.path.match(/-init.js$/), $.rename({
            extname: '.min.js',
        })))
        .pipe($.header(getHeaderComment()))
        .pipe($.if(process.env.NODE_ENV === 'dev', $.sourcemaps.write('.')))
        .pipe(gulp.dest(gulpConfig.js.to))
        .pipe(browserSync.stream())
));


/**
 * Static Task
 */
let staticCount = 0;
function staticTask(cb) {
    const staticArr = gulpConfig.static;
    if (staticArr.length && typeof staticArr[staticCount] !== 'undefined') {
        gulp.src(staticArr[staticCount].from)
            .pipe($.changed(staticArr[staticCount].to)) // Ignore unchanged files
            .pipe(gulp.dest(staticArr[staticCount].to))
            .on('end', () => {
                staticCount++;
                staticTask(cb);
            });
    } else {
        staticCount = 0;
        browserSync.reload();
        cb();
    }
}
gulp.task('static', staticTask);


/**
 * Images Task
 */
gulp.task('images', () => (
    gulp.src(gulpConfig.images.from)
        .pipe($.if(process.env.NODE_ENV === 'dev', $.plumber({ errorHandler })))
        .pipe($.changed(gulpConfig.images.to)) // Ignore unchanged files
        .pipe(gulp.dest(gulpConfig.images.to))
        .pipe(browserSync.stream())
));


/**
 * Default Task
 */
gulp.task('default', (cb) => {
    process.env.NODE_ENV = 'dev';
    $.sequence('clean', ['images'], ['html', 'css', 'js'], 'static', 'watch', cb);
});


/**
 * Watch Task
 */
gulp.task('watch', ['browserSyncTask'], () => {
    gulpConfig.watch.forEach((item) => {
        $.watch(item.from, () => {
            gulp.start(item.task);
        });
    });
});


/**
 * Deploy Task
 */
gulp.task('deploy', (cb) => {
    process.env.NODE_ENV = 'deploy';
    $.sequence('clean', ['images'], ['html', 'css', 'js'], 'static', 'deploy-zip', cb);
});

// deploy task: zip
gulp.task('deploy-zip', (cb) => {
    const taskNamesArray = [];
    gulpConfig.deploy.zip.forEach((item) => {
        taskNamesArray.push(`zip: ${item.to}`);
        gulp.task(`zip: ${item.to}`, () => {
            if (Array.isArray(item.from)) {
                return runStream(item.from, (itemData) => {
                    if (Array.isArray(itemData)) {
                        return gulp.src(itemData[0], itemData[1] ? itemData[1] : {});
                    }
                    return gulp.src(itemData);
                })
                    .pipe($.vinylZip.dest(`${item.to}`));
            }
            return gulp.src(item.from, {
                base: item.base,
            })
                .pipe($.vinylZip.dest(`${item.to}`));
        });
    });
    taskNamesArray.push(cb);

    $.sequence(...taskNamesArray);
});
