///ts:ref=globals
/// <reference path="../../globals.ts"/> ///ts:ref:generated
var simpleValidator = require('./simpleValidator');
var types = simpleValidator.types;
var compilerOptionsValidation = {
    allowNonTsExtensions: {
        type: simpleValidator.types.boolean
    },
    charset: {
        type: simpleValidator.types.string
    },
    codepage: {
        type: types.number
    },
    declaration: {
        type: types.boolean
    },
    diagnostics: {
        type: types.boolean
    },
    emitBOM: {
        type: types.boolean
    },
    help: {
        type: types.boolean
    },
    locals: {
        type: types.string
    },
    mapRoot: {
        type: types.string
    },
    module: {
        type: types.string,
        validValues: [
            'commonjs',
            'amd'
        ]
    },
    noEmitOnError: {
        type: types.boolean
    },
    noErrorTruncation: {
        type: types.boolean
    },
    noImplicitAny: {
        type: types.boolean
    },
    noLib: {
        type: types.boolean
    },
    noLibCheck: {
        type: types.boolean
    },
    noResolve: {
        type: types.boolean
    },
    out: {
        type: types.string
    },
    outDir: {
        type: types.string
    },
    preserveConstEnums: {
        type: types.boolean
    },
    removeComments: {
        type: types.boolean
    },
    sourceMap: {
        type: types.boolean
    },
    sourceRoot: {
        type: types.string
    },
    suppressImplicitAnyIndexErrors: {
        type: types.boolean
    },
    target: {
        type: types.string,
        validValues: [
            'es3',
            'es5',
            'es6'
        ]
    },
    version: {
        type: types.boolean
    },
    watch: {
        type: types.boolean
    },
};
var validator = new simpleValidator.SimpleValidator(compilerOptionsValidation);
exports.errors = {
    GET_PROJECT_INVALID_PATH: 'Invalid Path',
    GET_PROJECT_NO_PROJECT_FOUND: 'No Project Found',
    GET_PROJECT_FAILED_TO_OPEN_PROJECT_FILE: 'Failed to fs.readFileSync the project file',
    GET_PROJECT_JSON_PARSE_FAILED: 'Failed to JSON.parse the project file',
    GET_PROJECT_GLOB_EXPAND_FAILED: 'Failed to expand filesGlob in the project file',
    GET_PROJECT_PROJECT_FILE_INVALID_OPTIONS: 'Project file contains invalid options',
    CREATE_FILE_MUST_EXIST: 'To create a project the file must exist',
    CREATE_PROJECT_ALREADY_EXISTS: 'Project file already exists',
};
function errorWithDetails(error, details) {
    error.details = details;
    return error;
}
var fs = require('fs');
var path = require('path');
var expand = require('glob-expand');
var ts = require('typescript');
var os = require('os');
var formatting = require('./formatting');
var projectFileName = 'tsconfig.json';
var defaultFilesGlob = [
    "./**/*.ts",
    "!./node_modules/**/*.ts"
];
var typeScriptVersion = '1.4.1';
exports.defaults = {
    target: 1,
    module: 1,
    declaration: false,
    noImplicitAny: false,
    removeComments: true,
    noLib: false
};
var deprecatedKeys = {
    outdir: 'outDir',
    noimplicitany: 'noImplicitAny',
    removecomments: 'removeComments',
    sourcemap: 'sourceMap',
    sourceroot: 'sourceRoot',
    maproot: 'mapRoot',
    nolib: 'noLib'
};
var typescriptEnumMap = {
    target: {
        'es3': 0,
        'es5': 1,
        'es6': 2,
        'latest': 2
    },
    module: {
        'none': 0,
        'commonjs': 1,
        'amd': 2
    }
};
var jsonEnumMap = {
    target: (function () {
        var map = {};
        map[0] = 'es3';
        map[1] = 'es5';
        map[2] = 'es6';
        map[2] = 'latest';
        return map;
    })(),
    module: (function () {
        var map = {};
        map[0] = 'none';
        map[1] = 'commonjs';
        map[2] = 'amd';
        return map;
    })()
};
function mixin(target, source) {
    for (var key in source) {
        target[key] = source[key];
    }
    return target;
}
function rawToTsCompilerOptions(jsonOptions, projectDir) {
    var compilerOptions = mixin({}, exports.defaults);
    for (var key in jsonOptions) {
        if (deprecatedKeys[key]) {
            key = deprecatedKeys[key];
        }
        if (typescriptEnumMap[key]) {
            compilerOptions[key] = typescriptEnumMap[key][jsonOptions[key].toLowerCase()];
        }
        else {
            compilerOptions[key] = jsonOptions[key];
        }
    }
    if (compilerOptions.outDir !== undefined) {
        compilerOptions.outDir = path.resolve(projectDir, compilerOptions.outDir);
    }
    if (compilerOptions.out !== undefined) {
        compilerOptions.out = path.resolve(projectDir, compilerOptions.out);
    }
    return compilerOptions;
}
function tsToRawCompilerOptions(compilerOptions) {
    var jsonOptions = mixin({}, compilerOptions);
    if (compilerOptions.target !== undefined) {
        jsonOptions.target = jsonEnumMap.target[compilerOptions.target];
    }
    if (compilerOptions.module !== undefined) {
        jsonOptions.module = jsonEnumMap.module[compilerOptions.module];
    }
    return jsonOptions;
}
function getDefaultProject(srcFile) {
    var dir = fs.lstatSync(srcFile).isDirectory() ? srcFile : path.dirname(srcFile);
    var project = {
        compilerOptions: exports.defaults,
        files: [
            srcFile
        ],
        formatCodeOptions: formatting.defaultFormatCodeOptions(),
        compileOnSave: true
    };
    project.files = increaseProjectForReferenceAndImports(project.files);
    project.files = uniq(project.files.map(consistentPath));
    return {
        projectFileDirectory: dir,
        projectFilePath: dir + '/' + projectFileName,
        project: project
    };
}
exports.getDefaultProject = getDefaultProject;
function getProjectSync(pathOrSrcFile) {
    if (!fs.existsSync(pathOrSrcFile))
        throw new Error(exports.errors.GET_PROJECT_INVALID_PATH);
    var dir = fs.lstatSync(pathOrSrcFile).isDirectory() ? pathOrSrcFile : path.dirname(pathOrSrcFile);
    var projectFile = '';
    try {
        projectFile = travelUpTheDirectoryTreeTillYouFindFile(dir, projectFileName);
    }
    catch (e) {
        var err = e;
        if (err.message == "not found") {
            throw new Error(exports.errors.GET_PROJECT_NO_PROJECT_FOUND);
        }
    }
    projectFile = path.normalize(projectFile);
    var projectFileDirectory = path.dirname(projectFile) + path.sep;
    var projectSpec;
    try {
        var projectFileTextContent = fs.readFileSync(projectFile, 'utf8');
    }
    catch (ex) {
        throw new Error(exports.errors.GET_PROJECT_FAILED_TO_OPEN_PROJECT_FILE);
    }
    try {
        projectSpec = JSON.parse(projectFileTextContent);
    }
    catch (ex) {
        throw errorWithDetails(new Error(exports.errors.GET_PROJECT_JSON_PARSE_FAILED), {
            projectFilePath: consistentPath(projectFile),
            error: ex.message
        });
    }
    if (!projectSpec.compilerOptions)
        projectSpec.compilerOptions = {};
    var cwdPath = path.relative(process.cwd(), path.dirname(projectFile));
    if (!projectSpec.files && !projectSpec.filesGlob) {
        projectSpec.filesGlob = defaultFilesGlob;
    }
    if (projectSpec.filesGlob) {
        try {
            projectSpec.files = expand({
                filter: 'isFile',
                cwd: cwdPath
            }, projectSpec.filesGlob);
        }
        catch (ex) {
            throw errorWithDetails(new Error(exports.errors.GET_PROJECT_GLOB_EXPAND_FAILED), {
                glob: projectSpec.filesGlob,
                projectFilePath: consistentPath(projectFile),
                errorMessage: ex.message
            });
        }
        var prettyJSONProjectSpec = prettyJSON(projectSpec);
        if (prettyJSONProjectSpec !== projectFileTextContent) {
            fs.writeFileSync(projectFile, prettyJSON(projectSpec));
        }
    }
    projectSpec.files = projectSpec.files.map(function (file) {
        return path.resolve(projectFileDirectory, file);
    });
    var project = {
        compilerOptions: {},
        files: projectSpec.files,
        filesGlob: projectSpec.filesGlob,
        formatCodeOptions: formatting.makeFormatCodeOptions(projectSpec.formatCodeOptions),
        compileOnSave: projectSpec.compileOnSave == undefined ? true : projectSpec.compileOnSave
    };
    var validationResult = validator.validate(projectSpec.compilerOptions);
    if (validationResult.errorMessage) {
        throw errorWithDetails(new Error(exports.errors.GET_PROJECT_PROJECT_FILE_INVALID_OPTIONS), {
            projectFilePath: consistentPath(projectFile),
            errorMessage: validationResult.errorMessage
        });
    }
    if (projectSpec.compilerOptions && projectSpec.compilerOptions.out) {
        throw errorWithDetails(new Error(exports.errors.GET_PROJECT_PROJECT_FILE_INVALID_OPTIONS), {
            projectFilePath: consistentPath(projectFile),
            errorMessage: "We don't support --out because it will hurt you in the long run."
        });
    }
    project.compilerOptions = rawToTsCompilerOptions(projectSpec.compilerOptions, projectFileDirectory);
    project.files = increaseProjectForReferenceAndImports(project.files);
    project.files = uniq(project.files.map(consistentPath));
    projectFileDirectory = removeTrailingSlash(consistentPath(projectFileDirectory));
    return {
        projectFileDirectory: projectFileDirectory,
        projectFilePath: projectFileDirectory + '/' + projectFileName,
        project: project
    };
}
exports.getProjectSync = getProjectSync;
function createProjectRootSync(srcFile, defaultOptions) {
    if (!fs.existsSync(srcFile)) {
        throw new Error(exports.errors.CREATE_FILE_MUST_EXIST);
    }
    var dir = fs.lstatSync(srcFile).isDirectory() ? srcFile : path.dirname(srcFile);
    var projectFilePath = path.normalize(dir + '/' + projectFileName);
    if (fs.existsSync(projectFilePath))
        throw new Error(exports.errors.CREATE_PROJECT_ALREADY_EXISTS);
    var projectSpec = {};
    projectSpec.version = typeScriptVersion;
    projectSpec.compilerOptions = tsToRawCompilerOptions(defaultOptions || exports.defaults);
    projectSpec.filesGlob = defaultFilesGlob;
    fs.writeFileSync(projectFilePath, prettyJSON(projectSpec));
    return getProjectSync(srcFile);
}
exports.createProjectRootSync = createProjectRootSync;
function consistentPath(filePath) {
    return filePath.split('\\').join('/');
}
exports.consistentPath = consistentPath;
function increaseProjectForReferenceAndImports(files) {
    var filesMap = simpleValidator.createMap(files);
    var willNeedMoreAnalysis = function (file) {
        if (!filesMap[file]) {
            filesMap[file] = true;
            files.push(file);
            return true;
        }
        else {
            return false;
        }
    };
    var getReferencedOrImportedFiles = function (files) {
        var referenced = [];
        files.forEach(function (file) {
            try {
                var content = fs.readFileSync(file).toString();
            }
            catch (ex) {
                return;
            }
            var preProcessedFileInfo = ts.preProcessFile(content, true), dir = path.dirname(file);
            referenced.push(preProcessedFileInfo.referencedFiles.map(function (fileReference) {
                var file = path.resolve(dir, fileReference.fileName);
                if (fs.existsSync(file)) {
                    return file;
                }
                if (fs.existsSync(file + '.ts')) {
                    return file + '.ts';
                }
                if (fs.existsSync(file + '.d.ts')) {
                    return file + '.d.ts';
                }
                return null;
            }).filter(function (file) {
                return !!file;
            }).concat(preProcessedFileInfo.importedFiles.filter(function (fileReference) {
                return pathIsRelative(fileReference.fileName);
            }).map(function (fileReference) {
                var file = path.resolve(dir, fileReference.fileName + '.ts');
                if (!fs.existsSync(file)) {
                    file = path.resolve(dir, fileReference.fileName + '.d.ts');
                }
                return file;
            })));
        });
        return selectMany(referenced);
    };
    var more = getReferencedOrImportedFiles(files).filter(willNeedMoreAnalysis);
    while (more.length) {
        more = getReferencedOrImportedFiles(files).filter(willNeedMoreAnalysis);
    }
    return files;
}
function prettyJSON(object) {
    var cache = [];
    var value = JSON.stringify(object, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                return;
            }
            cache.push(value);
        }
        return value;
    }, 4);
    value = value.split('\n').join(os.EOL);
    cache = null;
    return value;
}
function pathIsRelative(str) {
    if (!str.length)
        return false;
    return str[0] == '.' || str.substring(0, 2) == "./" || str.substring(0, 3) == "../";
}
function selectMany(arr) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        for (var j = 0; j < arr[i].length; j++) {
            result.push(arr[i][j]);
        }
    }
    return result;
}
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
exports.endsWith = endsWith;
function uniq(arr) {
    var map = simpleValidator.createMap(arr);
    return Object.keys(map);
}
function makeRelativePath(relativeFolder, filePath) {
    var relativePath = path.relative(relativeFolder, filePath).split('\\').join('/');
    if (relativePath[0] !== '.') {
        relativePath = './' + relativePath;
    }
    return relativePath;
}
exports.makeRelativePath = makeRelativePath;
function removeExt(filePath) {
    return filePath.substr(0, filePath.lastIndexOf('.'));
}
exports.removeExt = removeExt;
function removeTrailingSlash(filePath) {
    if (!filePath)
        return filePath;
    if (endsWith(filePath, '/'))
        return filePath.substr(0, filePath.length - 1);
    return filePath;
}
exports.removeTrailingSlash = removeTrailingSlash;
function travelUpTheDirectoryTreeTillYouFindFile(dir, fileName) {
    while (fs.existsSync(dir)) {
        var potentialFile = dir + '/' + fileName;
        if (fs.existsSync(potentialFile)) {
            return potentialFile;
        }
        else {
            var before = dir;
            dir = path.dirname(dir);
            if (dir == before)
                throw new Error("not found");
        }
    }
}
exports.travelUpTheDirectoryTreeTillYouFindFile = travelUpTheDirectoryTreeTillYouFindFile;
