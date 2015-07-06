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
 
(function (module) {
    'use strict';
    
    function checkSections(conf) {
        if (!conf.tweets) {
            throw Error('Missing "tweets" section');
        }
        if (!conf.cleanup) {
            throw Error('Missing "cleanup" section');
        }
        if (!conf.links) {
            throw Error('Missing "links" section');
        }
        if (!conf.analysis) {
            throw Error('Missing "analysis" section');
        }
    }

    module.exports.loadConf = function (path) {
        var conf = orzo.readJSON(path);
        checkSections(conf);
        
        if (typeof conf.tweets.accounts === 'string') {
            conf.tweets.accounts = orzo.readJSON(conf.tweets.accounts);
        }
        if (typeof conf.tweets.blacklist === 'string') {
            conf.tweets.blacklist = orzo.readJSON(conf.tweets.blacklist);
        }
        return conf;
    }    
    
}(module));