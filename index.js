var filewalker = require('filewalker');
var _ = require('underscore');
var moment = require('moment');

var fs = require('fs');

moment.lang('zh-cn');

var mdListTpl = "<% _.each(mdList, function(md, name) { %>| <%= name %> | <%= md.size %>字节 | <%= formatDate(md.mtime) %>|\n<% }); %>";
var mdListPreTpl = '| 文件名        | 大小           | 修改时间  |\n| ------------- |:-------------:| -----:|\n';

// TODO 支持类 grunt 的 folder 和 file 的描述方式
var fwOption = {
  recursive: true,
  matchRegExp: new RegExp('^((?!node_modules).)*.md$')
};

function formatDate(date) {
  return moment(date).fromNow();
}

function walkAllMd(cb) {
  var scanFileMap = {}, fileReadCount = 0;
  filewalker('.', fwOption)
    .on('dir', function(p) {
      // console.log('dir:  %s', p);
    })
    .on('file', function(p, s) {
      console.log('file: %s, %d bytes', p, s.size);
      scanFileMap[p] = s;
      fs.readFile(p, {encoding: 'utf8'}, function (err, data) {
        if (err) throw err;
        scanFileMap[p].content = data;
        fileReadCount += 1;
        if (fileReadCount === Object.keys(scanFileMap).length) {
          // console.log(scanFileMap);
          var out = _.template(mdListTpl, {mdList: scanFileMap, formatDate: formatDate});
          out = mdListPreTpl + out;
          cb(out);
        }
      });
    })
    .on('error', function(err) {
      console.error(err);
    })
    .on('done', function() {
      // console.log('%d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
    })
  .walk();
}

exports.cli = cli = function() {
  walkAllMd(function(out) {
    console.log(out);
  });
};
// when all done, exec template prefix, then append to readme
