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

(function () {
    'use strict';

    var fitsDate,
        thresholdMi = 5,
        conf = require('conf').loadConf(env.inputArgs[0]);

    fitsDate = (function () {
        var input = env.inputArgs[1],
            parsed,
            ans,
            minDate, maxDate;

        function timeToMax(date) {
            date.setHours(23);
            date.setMinutes(59);
            date.setSeconds(59);
            date.setMilliseconds(999);
            return date;
        }
      
        function timeToMin(date) {
            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            return date;
        }

        if (input) {
            parsed = /(\d{4})-(\d{2})-(\d{2})/.exec(input);
            if (parsed) {
                ans = new Date(parseInt(parsed[1]), parseInt(parsed[2]) - 1, parseInt(parsed[3]));

            } else if (/-?\d/.exec(input)) {
                ans = new Date();
                ans.setDate(ans.getDate() + parseInt(input));

            } else {
                throw Error(orzo.sprintf('Unknown date format: %s', input));
            }

        } else {
            ans = new Date();
        }
        minDate = timeToMin(ans).getTime();
        maxDate = timeToMax(ans).getTime();
        return function (d) {
            return d.getTime() >= minDate && d.getTime() <= maxDate;
        }
    }());
    
    function extractLinks(text) {
        var links = text.match(/(https?:\/\/[^\s,]+)/g),
            ans = {};
        if (links) {
            links.forEach(function (k) {
                ans[k] = orzo.hash.md5(k);                
            });
        }
        return ans;        
    }
    
    function replaceLinks(text, links) {
        var p, linkPattern;
        
        for (p in links) {            
            if (links.hasOwnProperty(p)) {
                linkPattern = new RegExp(p.replace('?', '\\?'), 'g');
                text = text.replace(linkPattern, orzo.sprintf('~%s', links[p])); 
            }            
        }
        return text;
    }
    
    function wordIsUsername(w) {
        return w.indexOf('@') === 0;
    }


    dataChunks(2, function (idx) {
        return orzo.fileChunkReader(conf.analysis.srcFile, idx);
    });


    applyItems(function (dataChunk, map) {
        while (dataChunk.hasNext()) {
            map(dataChunk.next());
        }
    });

    map(function (data) {       
        var datetime, text, words, i, links;
        
        data = JSON.parse(data);            
        if (data.text) {
            datetime = new Date((data.time) * 1000);
            if (fitsDate(datetime)) {
                links = extractLinks(data.text);
                text = replaceLinks(data.text, links);                                
                text = text.toLocaleLowerCase().replace(/[\.\?!,:"\-\[\]|/]/g, ' ');
                words = text.trim().split(/\s+/);                
                for (i = 0; i < words.length - 1; i += 1) {
                    if (!wordIsUsername(words[i]) && !wordIsUsername(words[i + 1])) {
                        emit('<1>' + words[i] + ' ' + words[i + 1], 1);
                    }
                    if (!wordIsUsername(words[i])) {
                        emit('<2>' + words[i], 1);
                    }
                    if (!wordIsUsername(words[i + 1])) {
                        emit('<2>' + words[i + 1], 1);
                    }
                    if (!wordIsUsername(words[i]) || !wordIsUsername(words[i + 1])) {                    
                        emit('<t>', 1);
                    }
                }
            }
        }
    });


    reduce(2, function (key,  values) {
        emit(key, D(values).size());
    });

    finish(function (results) {
        var ans = [], bigram, p1, p2, total, mi;
        
        function getWord(w) {
            return w.substr(3);
        }

        total = results.get('<t>')[0];
        results.each(function (key, values) {
            if (key.indexOf('<1>') === 0) {
                bigram = getWord(key).split(' ');
                p1 = results.get('<2>' + bigram[0])[0] / total;
                p2 = results.get('<2>' + bigram[1])[0] / total;
                mi = Math.log(values[0] / total / (p1 * p2));
                if (isNaN(mi)) {
                    orzo.printf('Cannot calculate mi for [%s]\n', key);
                }
                if (mi >= thresholdMi) {
                    ans.push({num: values[0], text: key});
                }
            }
        });

        ans = ans.sort(function (x1, x2) { return x1.num - x2.num;});
        ans.forEach(function (v) {
            if (v.num > 1) {
                orzo.printf('%s --> %s\n', v.text.substr(3), v.num);
            }
        });
    });
}());
