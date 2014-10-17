/*
 * Copyright (C) 2014 Tomas Machalek
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

/*
  This script shows a sample usage of Orzo.js at the task of finding pairs
  of matching images thumbnail vs. regular image.

  Target dir is specified via command line argument:
  java -jar orzo-xxxx.jar ./find-thumbnails.js /path/to/my/pictures
 */

(function () {
    'use strict';

    var options = {
        numCreateTiles : 8,
        tileRatio : 0.2
    };

    /**
     *
     * @param {object} image
     * @param {function} image.areaHistogram
     * @param {object} coords
     * @param {number} coords.x
     * @param {number} coords.y
     * @param {object} size
     * @param {number} size.x
     * @param {number} size.y
     * @returns {array}
     */
    function areaHistogram(image, coords, size) {
        var maxX = image.width - size.x,
            maxY = image.height - size.y;

        return image.areaHistogram(coords.x * maxX, coords.y * maxY, size.x, size.y);
    }

    /**
     * Generates random [x,y] coordinates
     *
     * @returns {{x: number, y: number}}
     */
    function randomCoords() {
        return {
            x : Math.random(),
            y : Math.random()
        }
    }

    /**
     *
     * @param image
     * @param scale
     * @returns {{x: number, y: number}}
     */
    function scaleImageFrame(image, scale) {
        return {
            x : image.width * scale,
            y : image.height * scale
        }
    }

    /**
     *
     * @param image1
     * @param image2
     * @param {number} numCreateTiles how many tiles to create when comparing images
     * @param {number} tileRatio values from 0 to 1
     * @returns {*}
     */
    function compareTiles(image1, image2, numCreateTiles, tileRatio) {
        var tile1,
            tile2,
            sum = [],
            vector1,
            vector2,
            i,
            coords;

        if (image1 != null && image2 != null) {

            if (2 * Math.abs(image1.width - image2.width) / (image1.width + image2.width) < 0.6) {
                return 0;

            } else {

                tile1 = scaleImageFrame(image1, tileRatio);
                tile2 = scaleImageFrame(image2, tileRatio);

                for (i = 0; i < numCreateTiles; i += 1) {
                    coords = randomCoords();
                    vector1 = D(areaHistogram(image1, coords, tile1));
                    vector2 = D(areaHistogram(image2, coords, tile2));
                    sum.push(vector1.correl(vector2));
                }
                return D(sum).average();
            }

        } else {
            return 0;
        }
    }

    /*
     * Here we specify how data chunks are defined and how
     * many chunks are there (4)
     */
    dataChunks(4, function (idx) {
        return orzo.filePairGenerator(env.inputArgs[0], idx);
    });


    /*
     * We need to generate all the file pairs to be able to find the best
     * matching ones.
     */
    applyItems(function (dataChunk, map) {
        var files;

        while(dataChunk.hasNext()) {
            files = dataChunk.next();
            map({
                file1 : files[0],
                file2 : files[1]
            });
        }
    });


    /*
     * In the 'map' function we instantiate both images from passed data
     * and compare them using 'compareTiles' function with predefined number
     * of image tiles to be used (we do not want to calculate histograms on
     * whole images to speed things up a little bit)
     */
    map(function (data) {
        var image1, image2, similarity;

        image1 = orzo.loadImage(data.file1);
        image2 = orzo.loadImage(data.file2);
        similarity = compareTiles(
            image1,
            image2,
            options.numCreateTiles,
            options.tileRatio
        );

        emit(data.file1, { file: data.file2, similarity: similarity});
        emit(data.file2, { file: data.file1, similarity: similarity});
    });

    /*
     * In the 'reduce' function we just pass the data because there is no aggregation.
     */
    reduce(6, function (key,  values) {
        emit(key, values);
    });


    /*
     * When finished we just sort the matching lists of each file and print
     * the best ones.
     */
    finish(function (results, info) {
        results.each(function (key, values) {
            var sorted,
                best;

            orzo.printf('%s ->', key);
            sorted = values[0].sort(function (a, b) {
                if (a.similarity < b.similarity) {
                    return 1;
                }
                return -1;
            });
            best = sorted[0];
            orzo.printf(orzo.sprintf('\t%s (%01.2f)', best.file, best.similarity));
            orzo.printf('\n');
        });
        orzo.dump(info);
    });

}());