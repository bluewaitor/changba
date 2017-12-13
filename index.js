const rp = require("request-promise");
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
const fs = require("fs");
const async = require("async");
const {URL} = require('url');
const changbaUrl = "http://changba.com";


// 2626903 小不
const userid = 3816195;

const musicDir = "download/" + userid;
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir);
}

function getCheerio(url) {
  return {
    uri: url,
    transform: function(body) {
      return cheerio.load(body);
    }
  };
}

function getMusicPage(url, songname, callback) {
  rp(getCheerio(url))
    .then(function($) {
      let html = $("body").html();

      let reg = /a="(https?:\/\/)[\w\.\/]+\.mp3/g;
      let mp3Urls = html.match(reg);
      let targetMp3 = mp3Urls[0];
      targetMp3 = targetMp3.replace("a=\"", "")
      if (targetMp3) {
        let filename = musicDir + "/" + songname + ".mp3";
        if (fs.existsSync(filename)) {
          callback();
          console.log(songname + "已经存在了");
          return;
        }

        console.log("开始下载 ====> " + songname);
        console.log(targetMp3);
        const myUrl = new URL(targetMp3);
        let myHttp = http;
        if (myUrl.protocol === 'https:') {
            myHttp = https;
        }
        
        const req = myHttp.get(targetMp3, function(res, err) {
          var buffers = [];
          res.on("data", function(data) {
            buffers.push(data);
          });
          res.on("end", function() {
            var fileBuffer = Buffer.concat(buffers);
            fs.writeFile(filename, fileBuffer, function(err) {
              if (err) {
                console.error("写入文件失败: " + err);
                callback();
              } else {
                console.log("成功下载歌曲到: " + filename);
                callback();
              }
            });
          });
          res.on("error", function(err) {
            console.error("下载错误: " + targetMp3);
            callback();
          });
        });

        req.setTimeout(5000, function() {
            console.error('超时啦~~');
            callback();
        })
      } else {
        callback();
      }
    })
    .catch(e => {
      console.log(url);
      console.error("请求页面错误: " + e);
      callback();
    });
}



function getMoreUrl(page) {
  let url =
    "http://changba.com/member/personcenter/loadmore.php?ver=1&pageNum=" +
    page +
    "&type=0&userid=" + userid + "&curuserid=-1";
  return url;
}

let page = 0;
let done = false;

async.until(
  function() {
    console.log(page);
    return done;
  },
  function(cb) {
    rp({ uri: getMoreUrl(page), json: true }).then(res => {
      async.mapLimit(
        res,
        1,
        function(item, callback) {
          let url = changbaUrl + "/s/" + item.enworkid;
          getMusicPage(url, item.songname, callback);
        },
        function() {
          if (res && res.length !== 0) {
            page += 1;
          } else {
            done = true;
          }
          cb();
        }
      );
    });
  }
);
