const canvasHeight = 700,
    canvasHeightTiny = 300,
    canvasWidth = 700,
    canvasWidthTiny = 500;

const svgBubbles = d3.select("#canvas-bubbles").append("svg")
    .attr("width", canvasWidth)
    .attr("height", canvasHeight);

const svgLines = d3.select("#canvas-lines").append("svg")
    .attr("width", canvasWidthTiny)
    .attr("height", canvasHeightTiny);

const svgSentiment = d3.select("#canvas-sentiment").append("svg")
    .attr("width", canvasWidthTiny)
    .attr("height", canvasHeightTiny);

const margin = {top: 20, right: 20, bottom: 20, left: 20};
const marginTiny = {top: 20, right: 30, bottom: 20, left: 70};
const marginSentiment = {top: 20, right: 5, bottom: 20, left: 5};
const width = canvasWidth - margin.left - margin.right;
const widthTiny = canvasWidthTiny - marginTiny.left - marginTiny.right;
const widthSentiment = canvasWidthTiny - marginSentiment.left - marginSentiment.right;
const height = canvasHeight - margin.top - margin.bottom;
const heightTiny = canvasHeightTiny - marginTiny.top - marginTiny.bottom;

// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        this.parentNode.appendChild(this);
    });
};
d3.selection.prototype.moveToBack = function () {
    return this.each(function () {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

let format = d3.format(",d");

let pack = d3.pack()
    .size([width, height])
    .padding(1.5);

let fullData = [];
let currentData = [];
let currentCategory = "";
let currentRating = "";
let urlCurrentCategory = "";
let isSelectRatingGenerated = false;

function visualizeData() {
    d3.csv("data/kaggle/ted_main_with_sentiment.csv", function (d) {
        d.views = +d.views;
        if (d.views) return d;
    }, processData);
}

let buildDots = function (data) {
    let topValue = 0;
    let first = true;

    let root = d3.hierarchy({children: data})
        .sum(function (d) {
            return d.views;
        })
        .each(function (d) {
            if (first) {
                first = false;
            } else {
                if (d.value > topValue) {
                    topValue = d.value;
                }
            }
            if (id = d.data.id) {
                var id, i = id.lastIndexOf(".");
                d.id = id;
                d.package = id.slice(0, i);
                d.class = id.slice(i + 1);
            }
        });

    let packed = pack(root);

    if (currentRating !== "") {
        topValue = d3.max(data, function (d) {
            return d.ratingArray === undefined ? 0 : d.ratingArray[currentRating + "Percentage"];
        });
    }

    displayDots(packed, topValue)
};

let displayDots = function (packed, topValue) {
    let color = d3.scaleLinear()
        .domain([0, topValue])
        .range(['#ffb0ae', '#e53025'])
        .interpolate(d3.interpolateHcl);

    var div = d3.select("#canvas-bubbles").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svgBubbles.selectAll(".node").remove();

    let node = svgBubbles.selectAll(".node")
        .data(packed.leaves())
        .enter().append("g")
        .attr("class", "node")
        .attr("id", function (d) {
            return "bubble_" + d.data.url.slice(26);
        })
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on("mouseover", function (d) {

            div.html("<span class='tag'>" + d.data.title + "</span><br>" + d3.format(".2s")(d.data.views) + " views")
                .style("opacity", .9)
                .style("left", (d.x + "px"))
                .style("top", ((d.y - d.r - 50) + "px"));
        })
        .on("mouseout", function (d) {
            div.style("opacity", 0);
        })
        .attr("onclick", function (d) {
            return "window.open('" + d.data.url + "');"
        });

    let circle = node.append("circle")
        .attr("id", function (d) {
            return d.id;
        })
        .attr("class", "circle")
        .attr("r", 0)
        .style("fill", function (d) {
            return color(currentRating !== "" ? d.data.ratingArray[currentRating + "Percentage"] : d.value);
        });

    circle.transition()
        .attr("r", function (d) {
            return d.r;
        })
        .duration(2000);

    node.append("clipPath")
        .attr("id", function (d) {
            return "clip-" + d.id;
        })
        .append("use")
        .attr("xlink:href", function (d) {
            return "#" + d.id;
        });
};

let displayBars = function (data) {
    var dataFormed = d3.values(data).map(function (d, i) {
        var dataF = {};
        dataF.key = Object.keys(data)[i];
        dataF.value = d;
        return dataF;
    });

    buildRatingSelect(dataFormed);

    var sum = d3.sum(dataFormed, function (d) {
        return d.value;
    });

    var percentageScale = d3.scaleLinear().domain([0, sum]).rangeRound([0, 100]);

    var g = svgLines.append("g")
        .attr("transform", "translate(" + marginTiny.left + "," + marginTiny.top + ")");

    var div = d3.select("#canvas-lines").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);


    var x = d3.scaleLinear()
        .range([0, widthTiny])
        .domain([0, d3.max(dataFormed, function (d) {
            return d.value;
        })]);

    var y = d3.scaleBand().rangeRound([heightTiny, 0]).padding(0.1)
        .domain(d3.values(dataFormed).map(function (d) {
            return d.key;
        }));

    svgLines.append("g")
        .attr('class', 'y axis')
        .attr('transform', 'translate(' + [marginTiny.left, marginTiny.top] + ')')
        .call(d3.axisLeft(y));


    svgLines.selectAll(".bar").remove();

    var bars = g.selectAll(".bar")
        .data(dataFormed)
        .enter().append("g");

    bars.append("rect").attr("class", function (d) {
        if (x(d.value) === widthTiny) {
            var e = document.getElementById("selected-category-rating");
            e.textContent = d.key;
        }
        if (d.key === currentRating.toLowerCase()) {
            return "bar current"
        } else {
            return "bar" + (x(d.value) === widthTiny ? " highest" : "")
        }
    })
        .attr("x", 0)
        .attr("y", function (d) {
            return y(d.key);
        })
        .attr("height", y.bandwidth())
        .attr("width", function (d) {
            return x(d.value);
        });

    bars.append("text")
        .attr("class", "label")
        .attr("y", function (d) {
            return y(d.key) + y.bandwidth() / 2;
        })
        .attr("x", function (d) {
            return x(d.value) + 10;
        })
        .text(function (d) {
            return percentageScale(d.value) + "%";
        });
};


let buildRatingArray = function (data) {
    data.forEach(function (f) {
        if (f.ratings !== undefined) {
            let ratings = JSON.parse(f.ratings);
            f.ratingArray = [];

            //Building Rating array
            var jsonData = {};
            jsonData._all = 0;

            ratings.forEach(function (rating) {
                jsonData._all += rating.count;
            });

            ratings.forEach(function (rating) {
                jsonData[rating.name.replace(/\W/g, '')] = rating.count;
                jsonData[rating.name.replace(/\W/g, '') + "Percentage"] = 100 / jsonData._all * rating.count;
            });

            f.ratingArray = jsonData;
        }
    });
};

let buildBars = function (data) {
    var categoryMap = d3.values(data).map(function (d) {
        return d.ratingArray
    });

    var categoryMatching = d3.nest()
        .rollup(function (item) {
            return {
                fascinating: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Fascinating;
                }),
                beautiful: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Beautiful;
                }),
                ingenious: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Ingenious;
                }),
                courageous: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Courageous;
                }),
                longwinded: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Longwinded;
                }),
                confusing: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Confusing;
                }),
                informative: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Informative;
                }),
                unconvincing: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Unconvincing;
                }),
                persuasive: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Persuasive;
                }),
                jawdropping: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Jawdropping;
                }),
                OK: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.OK;
                }),
                obnoxious: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Obnoxious;
                }),
                inspiring: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Inspiring;
                }),
                funny: d3.sum(item, function (d2) {
                    return d2 === undefined ? 0 : 100 / d2._all * d2.Funny;
                }),
            };
        })
        .entries(categoryMap);
    displayBars(categoryMatching);


};

let buildSentimentCurves = function (data) {

    let dataFormed = d3.values(data).map(function (d, i) {
        let niceObject = [];
        niceObject.title = d.title;
        niceObject.url = d.url;
        niceObject.views = d.views;
        let niceData = [];
        for (let j = 1; j <= 5; j++) {
            let dataF = {};
            dataF.sentimentIndicator = j;
            dataF.sentimentValue = Number(d["sentiment" + j]);
            niceData.push(dataF);
        }
        niceObject.values = niceData;
        return niceObject;
    });

    dataFormed = dataFormed.sort(function (a, b) {
        if (a.views === undefined) {
            a.views = 0;
        }
        if (b.views === undefined) {
            b.views = 0;
        }
        return d3.descending(+a.views, +b.views);
    }).slice(0, 30);

    dataFormed = dataFormed.sort(function (a, b) {
        return d3.ascending(+a.views, +b.views);
    });

    var g = svgSentiment.append("g")
        .attr("transform", "translate(" + marginSentiment.left + "," + marginTiny.top + ")");

    var div = d3.select("#canvas-sentiment").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var x = d3.scaleTime().range([0, widthSentiment]).domain([1, 5]),
        y = d3.scaleLinear().range([heightTiny, 0]).domain([1, 5]);

    var line = d3.line()
        .x(function (d) {
            return x(d.sentimentIndicator);
        })
        .y(function (d) {
            return y(d.sentimentValue);
        });

    svgSentiment.selectAll(".sentimentValue").remove();

    var goodOldLine = g.selectAll(".sentimentValue")
        .data(dataFormed)
        .enter().append("g")
        .attr("class", function (d) {
            return "sentimentValue" + (d.url === urlCurrentCategory ? " selected" : "");
        });

    goodOldLine.append("path")
        .attr("class", "line")
        .attr("d", function (d) {
            return line(isNaN(d.values[0].sentimentValue) ? 0 : d.values);
        })
        .attr("fill", "none")
        .attr("stroke", "#d7d7d7")
        .attr("stroke-width", 2)
        .on("mouseover", function (d) {
            var bubble = document.getElementById("bubble_" + (d.url.slice(26)));
            bubble.classList.add("selected");

            d3.select(this.parentNode).moveToFront();
            div.html("<span class='tag'>" + d.title + "</span><br>Start: " + getSentimentText(d.values[0].sentimentValue + ".0") + "  |  End: " + getSentimentText(d.values[4].sentimentValue + ".0"))
                .style("opacity", .9)
                .style("left", (d3.mouse(this)[0] + "px"))
                .style("top", ((d3.mouse(this)[1] - 40) + "px"));
        })
        .on("mouseout", function (d) {
            var bubble = document.getElementById("bubble_" + (d.url.slice(26)));
            bubble.classList.remove("selected");

            if (d.url !== urlCurrentCategory) {
                d3.select(this.parentNode).moveToBack();
            }
            div.style("opacity", 0);
        });

};

function processData(error, data) {
    if (error) throw error;
    currentData = data;
    fullData = data;
    buildCategorySelect(data);

    buildRatingArray(data);

    rebuild(data);
}

function buildRatingSelect(data) {
    if (isSelectRatingGenerated) return;
    isSelectRatingGenerated = true;

    var selectObject = document.getElementById("select-rating");

    data.forEach(function (x) {
        let option = document.createElement("option");
        option.text = x.key;

        selectObject.add(option)
    });
}


function buildCategorySelect(data) {
    let tags = {};
    data.forEach(function (x) {
        let elements = JSON.parse(x.tags);
        elements.forEach(function (y) {
            if (tags[y]) {
                tags[y].value += 1;
            } else {
                var obj = {};
                obj['key'] = y;
                obj['value'] = 1;
                tags[y] = obj;
            }
        });
    });

    tags = d3.values(tags).sort(function (a, b) {
        return d3.descending(+a.value, +b.value);
    }).slice(0, 40);

    var selectObject = document.getElementById("select-category");

    tags.forEach(function (y) {
        let option = document.createElement("option");
        option.text = y.key;

        selectObject.add(option);
    });
}

function onChangeCategory() {
    var selectCategory = document.getElementById("select-category");
    var selectCategoryLabel = document.getElementById("selected-category-label");

    if (selectCategory.options[selectCategory.selectedIndex].value === "-1") {
        currentCategory = "";
        currentData = fullData;
        selectCategoryLabel.textContent = "Whatever"
    } else {
        currentCategory = selectCategory.options[selectCategory.selectedIndex].value;
        currentData = fullData.filter(function (d) {
            return d.tags.includes(currentCategory)
        });
        selectCategoryLabel.textContent = currentCategory;
    }

    rebuild(currentData);
}

function onChangeRating() {
    var e = document.getElementById("select-rating");
    var label = document.getElementById("bubbles-sortby");

    if (e.options[e.selectedIndex].value === "-1") {
        currentRating = "";
        label.textContent = "view count"
    } else {
        currentRating = e.options[e.selectedIndex].value;
        currentRating = currentRating[0].toUpperCase() + currentRating.slice(1);
        label.textContent = currentRating;
    }

    rebuild(currentData);
}


function getSentimentText(value) {
    switch (value) {
        case "5.0":
            return "very positive";
        case "4.0":
            return "positive";
        case "3.0":
            return "neutral";
        case "2.0":
            return "negative";
        case "1.0":
            return "very negative";
    }
}


function buildText(data) {

    var dataFormed = Object.create(data);

    dataFormed = dataFormed.sort(function (a, b) {
        return d3.descending(+a.views, +b.views);
    });

    var e = document.getElementById("selected-category-mostviewed");
    e.textContent = dataFormed[0].title;

    var sentimentLabel = document.getElementById("selected-category-sentiment");
    sentimentLabel.textContent = getSentimentText(dataFormed[0].sentiment1);

    urlCurrentCategory = dataFormed[0].url;
}

function rebuild(data) {
    buildText(data);
    buildDots(data);
    buildBars(data);
    buildSentimentCurves(data);
}

visualizeData();

