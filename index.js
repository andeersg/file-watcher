var fs = require('fs');

var watchers = [];
var plugins = {};

var data = JSON.parse(fs.readFileSync(__dirname + '/config.json'));

plugins.processFile = function(context) {
  var ext = context.filename.match(/.([a-zA-Z0-9]+)$/);
  context.filename = context.filename.replace('.' + ext[1], '');
  context.filename = context.filename + '-modified.' + ext[1];

  return context;
};

plugins.moveFile = function(context) {
  fs.renameSync(context.currentPath, context.outputPath + '/' + context.filename);
  return context;
};


var handleChanges = function(eventType, filename) {
  var info = data[this.id];
  console.log(eventType, filename);

  var context = {
    'currentPath': info.watchDir + '/' + filename,
    'outputPath': info.outputDir,
    'originalFilename': filename,
    'filename': filename,
    'stat': {}
  };

  var fileMatch = true;

  info.matchPatterns.forEach(function(pat) {
    if (!filename.match(pat)) {
      fileMatch = false;
    }
  });
  if (!fileMatch) {
    console.log('This file does not match, skipping');
    return;
  }

  var fileProcess = new Promise(function(resolve, reject) {
    if (fs.existsSync(context.currentPath)) {
      return resolve(context.currentPath);
    }
    return reject('No file actually in folder');
  });
  fileProcess.then(function() {
    var stat = fs.statSync(context.currentPath);
    if (stat.isFile()) {
      return stat;
    }

    // @TODO Should handle this better.
    throw new Error('Element is not a file');
  })
  .then(function(stat) {
    context.stat = stat;

    info.plugins.forEach(function(plugin) {
      console.log('Executing:', plugin);
      context = plugins[plugin](context);
    });
    console.log('All plugins executed');

    return context;
  })
  .then(function(context) {
    console.log('Finished with chain');
    console.log(context);
  })
  .catch(function(err) {
    console.log('Error:');
    console.log(err);
  });
};


console.log('####################');
console.log('# Starting watcher #');
console.log('####################');
console.log('');

data.forEach(function(item, i) {
  console.log('Start watching:', item.watchDir);
  var watcher = fs.watch(item.watchDir, 'utf8', handleChanges);
  watcher.id = i;
  watchers.push(watcher);
});
