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

    var numWorkers = 3,
        conf = require('conf').loadConf(env.inputArgs[0]);

    dataChunks(numWorkers, function (idx) {
        return orzo.fileChunkReader(conf.sort.srcFile, idx);
    });


    applyItems(function (dataChunk, map) {
        while (dataChunk.hasNext()) {
        	map(dataChunk.next());
        }
    });

    map(function (data) {
        var parsed = JSON.parse(data);
        if (parsed.text && conf.tweets.blacklist.indexOf(parsed.account) === -1) {
            emit(String(parsed.time), data);
        }
    });


    reduce(numWorkers, function (key,  values) {
        values.forEach(function (item) {
            emit(key, item); 
        });
    });


    finish(function (results) {
        doWith(orzo.fileWriter(conf.sort.dstFile),
            function (fw) {
                results.sorted.each(function (key, values) {
                    if (values[0]) {
                        fw.writeln(values[0]);
                    }
                });
            },
            function (err) {
                orzo.printf('ERROR: %s', err);
            }
        );
    });

}());
