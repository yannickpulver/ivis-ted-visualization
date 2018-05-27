const canvasHeight = 600,
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
const width = canvasWidth - margin.left - margin.right;
const widthTiny = canvasWidthTiny - margin.left - margin.right;
const height = canvasHeight - margin.top - margin.bottom;
const heightTiny = canvasHeightTiny - margin.top - margin.bottom;

let format = d3.format(",d");

let pack = d3.pack()
    .size([width, height])
    .padding(1.5);

let fullData = [];
let currentData = [];
let currentCategory = "";

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

    displayDots(packed, topValue)
};

let displayDots = function (packed, topValue) {
    let color = d3.scaleLinear()
        .domain([1, topValue])
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
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on("mouseover", function (d) {
            div.html(d.data.title)
                .style("opacity", .9)
                .style("left", (d.x + "px"))
                .style("top", ((d.y - 50) + "px"));
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
            return color(d.value);
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

    var x = d3.scaleBand().rangeRound([0, widthTiny]).padding(0.1),
        y = d3.scaleLinear().rangeRound([heightTiny, 0]);


    var sum = d3.sum(dataFormed, function (d) {
        return d.value;
    });

    var percentageScale = d3.scaleLinear().domain([0, sum]).rangeRound([0, 100]);

    var g = svgLines.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var div = d3.select("#canvas-lines").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    x.domain(d3.values(dataFormed).map(function (d) {
        return d.key;
    }));
    y.domain([0, d3.max(dataFormed, function (d) {
        return d.value;
    })]);
    let innerg = g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    svgLines.selectAll(".bar").remove();

    g.selectAll(".bar")
        .data(dataFormed)
        .enter().append("rect")
        .attr("class", function (d) {
            if (y(d.value) === 0) {
                var e = document.getElementById("selected-category-rating");
                e.textContent = d.key;
            }
            return "bar" + (y(d.value) === 0 ? " highest" : "")
        })
        .attr("x", function (d) {
            return x(d.key);
        })
        .attr("y", function (d) {
            return y(d.value);
        })
        .attr("width", x.bandwidth())
        .attr("height", function (d) {
            return height - y(d.value);
        })
        .on("mouseover", function (d) {
            div.html(percentageScale(d.value) + "%")
                .style("opacity", .9)
                .style("left", (x(d.key) + x.bandwidth()) + "px")
                .style("top", (y(d.value) - 20) + "px");
        })
        .on("mouseout", function (d) {
            div.style("opacity", 0);
        });
};

let buildBars = function (data) {
    data.forEach(function (f) {
        if (f.ratings !== undefined) {
            let ratings = JSON.parse(f.ratings);
            f.ratingArray = []

            //Building Rating array
            var jsonData = {};
            jsonData._all = 0;
            ratings.forEach(function (rating) {
                jsonData[rating.name.replace(/\W/g, '')] = rating.count;
                jsonData._all += rating.count;
            });

            f.ratingArray = jsonData;
        }
    });

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


    console.log(categoryMatching);


    displayBars(categoryMatching);


};

let buildSentimentCurves = function (data) {

    let dataFormed = d3.values(data).map(function (d, i) {
        let niceObject = [];
        niceObject.title = d.title
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
        return d3.descending(+a.views, +b.views);
    }).slice(0, 10);

    var g = svgSentiment.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var div = d3.select("#canvas-sentiment").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var x = d3.scaleTime().range([0, widthTiny]).domain([1, 5]),
        y = d3.scaleLinear().range([heightTiny, 0]).domain([1, 5]);

    var line = d3.line()
        .curve(d3.curveBasis)
        .x(function (d) {
            return x(d.sentimentIndicator);
        })
        .y(function (d) {
            return y(d.sentimentValue);
        });

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("fill", "#000");

    svgSentiment.selectAll(".sentimentValue").remove();


    var goodOldLine = g.selectAll(".sentimentValue")
        .data(dataFormed)
        .enter().append("g")
        .attr("class", "sentimentValue");

    goodOldLine.append("path")
        .attr("class", "line")
        .attr("d", function (d) {
            return line(d.values);
        })
        .attr("fill", "none")
        .attr("stroke", "#d7d7d7")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 3)
        .on("mouseover", function (d) {
            div.html(d.title)
                .style("opacity", .9)
                .style("left", (d3.mouse(this)[0] + "px"))
                .style("top", ((d3.mouse(this)[1] - 20) + "px"));
        })
        .on("mouseout", function (d) {
            div.style("opacity", 0);
        });
};

function processData(error, data) {
    if (error) throw error;
    currentData = data;
    fullData = data;
    buildCategorySelect(data);

    rebuild(data);
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

function buildSentimentCategory(data) {

}


function onChangeCategory() {
    var e = document.getElementById("select-category");
    currentCategory = e.options[e.selectedIndex].value;
    currentData = fullData.filter(function (d) {
        return d.tags.includes(currentCategory)
    });

    var e = document.getElementById("selected-category-label");
    e.textContent = currentCategory;

    console.log(currentData.length);


    rebuild(currentData);
}

function rebuild(data) {
    buildDots(data);
    buildBars(data);
    buildSentimentCurves(data);
}

visualizeData();

