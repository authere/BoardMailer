var PAGE_LIMIT = 20;
var $ = require('jquery');
var _ = require('underscore');
var nodemailer = require("nodemailer");
var URL = require("url");
var fs = require("fs");
var halfHour = (0.5 * 60 * 60 * 1000); // 30min
var oneHour = (60 * 60 * 1000); // 1 hour
var twoHour = (2 * 60 * 60 * 1000); // 2 hour
var threeHour = (3 * 60 * 60 * 1000); // 3 hour
var sixHour = (6 * 60 * 60 * 1000);
var twelveHour = (12 * 60 * 60 * 1000);
var oneDay = (24 * 60 * 60 * 1000);
var mailSentList = {};

var cfgFile = 'board.cfg';
var mailSentListFile = 'mailSentList.cfg';
var board_cfg;
var now;
var timeoutId;
var mailSentNum = 0;

function traverseBoard(url, name, cfg, page) {
    $.get(url + "&page=" + page, function (data) {
        var DontIgnore = true;
        var urlItem;
        console.log("BOARD:" + name + " page=" + page);
        var list = $(data).find(cfg.listSelector);
        listLen = list.length;
        list.each(function (index) {
            var td = $(this).find('td');
            var id, subj, rcnt, time, vcnt;

            id = td.html();
            if (!parseInt(id, 10)) { return; } // id is number
            td = td.next('.post_subject');
            subj = td.find('a').html();
            rcnt = td.find('span').html();
            if (rcnt != null) {
                rcnt = rcnt.match(/\d+/);
                if (rcnt !== null) { rcnt = rcnt[0]; }
            }
            if (rcnt === null) { rcnt = 0; }
            td = td.next();
            //skip name
            td = td.next();
            time = td.find('span').attr('title');
            time = time ? Date.parse(time) : now;
            if ((now - time) > cfg.dur) {
                DontIgnore = false;
            }
            td = td.next();
            vcnt = td.html();
            //console.log(id + " " + vcnt + ":" + rcnt + "-" + subj);
            if (DontIgnore
                    && (vcnt > cfg.vcnt)
                    && (rcnt > cfg.rcnt)) {
                if (!mailSentList[id]) {
                    console.log(id + " " + (new Date(time)) + " " + vcnt + ":" + rcnt + "-" + subj);
                    urlItem = url + '&wr_id=' + id;
                    $.get(urlItem, function (data) {
                        var boardUrl = URL.parse(url);
                        var hostUrl = boardUrl.protocol + "//" + boardUrl.hostname;
                        var relUrl = dirname(url);
                        var cnt = $(data).find('.view_content');
                        $(cnt).find('img').each(function () {
                            if (this.src.charAt(0) === '.') {
                                this.src = relUrl + this.src;
                            } else if (this.src.charAt(0) === '/') {
                                this.src = hostUrl + this.src;
                            }
                        });
                        $(cnt).find('a').each(function () {
                            if (this.href.charAt(0) === '.') {
                                this.href = relUrl + this.href;
                            } else if (this.href.charAt(0) === '/') {
                                this.href = hostUrl + this.href;
                            }
                        });
                        var repl = $(data).find('#comment_wrapper');
                        $(repl).find('img').each(function () {
                            if (this.src.charAt(0) === '.') {
                                this.src = relUrl + this.src;
                            } else if (this.src.charAt(0) === '/') {
                                this.src = hostUrl + this.src;
                            }
                        });
                        //var style = '<style>li{float:left;}\n</style>\n';
                        var style = '';
                        //console.log($(cnt).html() + $(repl).html());
                        var linkToItem = "<br><a href=" + urlItem + ">Link</a><br>";
                        sendmail(name + " " + subj, style + $(cnt).html() + linkToItem + $(repl).html());
                        mailSentNum++;
                        mailSentList[id] = now;
                    });
                }
            }
            if (DontIgnore && (index === (listLen - 1))) {
                if (page < PAGE_LIMIT) {
                    traverseBoard(url, name, cfg, page + 1);
                }
            }
        });
    });
}

function dirname(path) {
    return path.match(/.*\//)[0];
}


function sendmail(subj, data) {

    var auth =  {
            user: (process.env.EMAIL || "dontknow@gmail.com"),
            pass: (process.env.EMAILPASS || "")
        };
// create reusable transport method (opens pool of SMTP connections)
    var smtpTransport = nodemailer.createTransport("SMTP", {
        service: "Gmail",
        auth: auth,
    });

// setup e-mail data with unicode symbols
    var mailOptions = {
        from: "bdmon <sender@example.com>", // sender address
        to: process.env.EMAIL_RECIPANT, // list of receivers
        subject: subj, // Subject line
        //text: "Hello world ✔", // plaintext body
        html: data // html body
    };

// send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            console.log(error);
        } else {
            console.log("Message sent: " + response.message);
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        mailSentNum--;
        if (mailSentNum <= 0) {
            timeoutId = setTimeout(function () {
                smtpTransport.close(); // shut down the connection pool, no more messages
                process.exit(0);
                console.error('closing... the last mail sent');
                
            }, 30000);
        }
    });
}
process.on('exit', function () {
    console.log('On exit');
    fs.writeFileSync(mailSentListFile, JSON.stringify(mailSentList));
});

process.on('SIGTERM', function () {
    process.exit(0);
});
process.on('SIGHUP', function () {
    console.log('Got SIGHUP');
    //reload config
    fs.readFile(cfgFile, function (err, data) {
        if (err) {
            console.log("Error: SIGHUP reloading " + cfgFile);
        } else {
            board_cfg = JSON.parse(data);
        }
    });
});

try {
    board_cfg = JSON.parse(fs.readFileSync(cfgFile));
} catch (e) {
    console.log("Error: loading " + cfgFile);
    process.exit(0);
}
try {
    mailSentList = JSON.parse(fs.readFileSync(mailSentListFile));
} catch (e) {}

now = Date.now();
$.each(board_cfg, function (key, val) {
    traverseBoard(val.url, val.name, val.cfg, 1);
});
$.each(mailSentList, function (key, val) {
    if ((now - mailSentList[key]) > oneDay) {
        delete mailSentList[key];
    }
});


process.on('uncaughtException', function (err) {
  console.error('[uncaughtException] ' + err.stack);
  setTimeout(function () {
    process.exit(1);
  }, 500);
});

