var filewalker = require('filewalker');
var _ = require('underscore');
var moment = require('moment');
moment.lang('zh-cn');

var fs = require('fs');


// TODO 支持类 grunt 的 folder 和 file 的描述方式
var fwOption = {
  recursive: true,
  matchRegExp: new RegExp('^((?!node_modules).)*.md$')
};


var markdownFileTablePlugin = (function() {

  var eachFn = function(p, s, content) {
    // _summaryMd(content);
    // TODO: extract all current path/dir data here
    walk.next(this.name);
  };

  var summaryFn = function(summaryList, cb) {
    var mdListTpl = "<% _.each(mdList, function(md, name) { %>| <%= name %> | <%= md.size %>字节 | <%= formatDate(md.mtime) %>| <%= summaryMd(md.content) %>|\n<% }); %>";
    var mdListPreTpl = '| 文件名        | 大小           | 修改时间  |    正文     |\n| ------------- |:-------------:| -----:|\n';

    var out = _.template(mdListTpl, {mdList: summaryList, formatDate: _formatDate, summaryMd: _summaryMd});
    out = mdListPreTpl + out;
    cb && cb(out);
  };

  function _formatDate(date) {
    return moment(date).fromNow();
  }

  function _summaryMd(content) {
    // get the first title's param, limit to 30 characters
    var regexp = /#+.*?\n(.*)\n/;
    var match = content.match(regexp);
    if(match && match[1]) {
      return match[1].slice(0, 80); // first group
    }
    if(content.split('\n')[1]) {
      return content.split('\n')[1].slice(0, 80);
    } else {
      return '<暂无内容>';
    }
  }

  return {
    name: 'markdownFileTablePlugin',
    matcher: '.md',
    eachFn: eachFn,
    summaryFn: summaryMd
  };
})();

var walk = (function() {
  var _dict = {files: {}};
  var _plugins = [];

  add: function(plugin) {
    _dict[plugin.name].processCount = 0;
    _dict[plugin.name].scanCount = 0;
  },

  next: function(plugin) {
    pluginName = plugin.name;
    _dict[pluginName].processCount +=1;
    if(_dict.walked && (_dict[pluginName].processCount === _dict[pluginName].scanCount)) {
      plugin.summaryFn();
    }
  },

  // readFile: function(path) {
  //   if(_dict.files[path]) return _dict.files[path];
  //   fs.readFile(p, {encoding: 'utf8'}, function (err, data) {
  //     _dict.files[path] = data;
  //     return _dict.files[path];
  //   });
  // },

  start: function() {
    filewalker('.', fwOption)
      .on('file', function(p, s) {
        _.each(_plugins, function(plugin) {
          if(plugin.matcher.test(p)) {
            // dirty, coupled with cache read file logic
            var content = _dict.files[p];
            if(content) {
              _dict[plugin.name].scanCount +=1;
              plugin.eachFn && plugin.eachFn(p, s, content); // eachFn maybe async!
            } else {
              fs.readFile(p, {encoding: 'utf8'}, function (err, data) {
                _dict.files[p] = data;
                content = data;
                _dict[plugin.name].scanCount +=1;
                plugin.eachFn && plugin.eachFn(p, s, content); // eachFn maybe async!
              });
            }
          }
        });
      })
      .on('dir', function(s) {

      })
      .on('error', function(err) {
        console.error(err);
      })
      on('done', function() {
        // console.log('%d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
        _dict.walked = true;
      });
  },

  return {
    add: addFn,
    start: startFn
  };
})();


exports.cli = cli = function() {
  walk.add(markdownFileTablePlugin).start();
  // when all done, exec template prefix, then append to readme
};


