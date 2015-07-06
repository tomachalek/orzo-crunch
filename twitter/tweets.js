/*
 * Copyright (C) 2015 Tomas Machalek
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/// <reference path="../orzojs.d.ts" />
/// <reference path="./conf.d.ts" />

var numWorkers = 4;
var conf = require('conf').loadConf(env.inputArgs[0]);
var waitTime = function () { return 5; };

dataChunks(numWorkers, function (i) {
    var j, ans = [];

    for (j = i; j < conf.tweets.accounts.length; j += numWorkers) {
        ans.push(conf.tweets.accounts[j]);
    }

    return ans;
});


applyItems(function (dataChunk, map) {
    dataChunk.forEach(function (item) {
        map(item);
    });
});


map(function (url) {
    orzo.print(url);
    
    function applyOnFirst(where, query, fn) {
        var srch = orzo.html.find(where, query);
        if (srch.length > 0) {
            fn(srch[0]);
        }
    }    
    
    try {
        page = orzo.html.loadWebsite(url);
        orzo.html.query(page, 'div.tweet', function (tweetBlock) {
            orzo.printf('\ttweet');
            var out = {id: null, time: '-', account: url, text: null};
            applyOnFirst(tweetBlock, 'span.js-short-timestamp', function (item) {
                out.time = item.dataset().time;
            });
            applyOnFirst(tweetBlock, 'p.tweet-text', function (item) {
                out.text = item.text();
            });
            out.id = tweetBlock.dataset()['item-id'];
            emit(out.time, out);
        });
        orzo.sleep(waitTime());

    } catch (e) {
        orzo.printf('ERROR: %s\n', e);
    }
});


reduce(numWorkers, function (key, data) {
    data.forEach(function (item) {
        emit(key, item);
    });
});


finish(function (results) {
    
    function dateStamp() {
        var d = new Date();
        return orzo.sprintf('%02d%02d%02d', d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
        
    doWith(orzo.fileWriter(orzo.sprintf(conf.tweets.crawlerOutFile, dateStamp())),
        function (fw) {
            results.sorted.each(function (key, data) {
                data.forEach(function (dataItem) {
                    fw.writeln(JSON.stringify({
                        id: dataItem.id,
                        time: parseInt(dataItem.time),
                        account: dataItem.account,
                        text: dataItem.text
                    }));
                });
            });
        },
        function (err) {
            orzo.printf('error: %s\n', err);
        }
    );
});