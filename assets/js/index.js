const canvHeight = 600, canvWidth = 800;

const svgBubbles = d3.select("#canvas-bubbles").append("svg")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .style("border", "1px solid #ccc");

const svgLines = d3.select("#canvas-lines").append("svg")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .style("border", "1px solid #ccc");

const margin = {top: 20, right: 20, bottom: 20, left: 50};
const width = canvWidth - margin.left - margin.right;
const height = canvHeight - margin.top - margin.bottom;

let format = d3.format(",d");

let pack = d3.pack()
    .size([width, height])
    .padding(1.5);

let currentData = "";


function visualizeData() {
    d3.csv("data/kaggle/ted_main_wrangled.csv", function (d) {
        d.views = +d.views;
        if (d.views) return d;
    }, processData);
}

let buildDots = function (packed, topValue) {
    let color = d3.scaleLinear()
        .domain([1, topValue])
        .range(['#ffb0ae', '#e53025'])
        .interpolate(d3.interpolateHcl);

    let node = svgBubbles.selectAll(".node")
        .data(packed.leaves())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    let circle = node.append("circle")
        .attr("id", function (d) {
            return d.id;
        })
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

    node.append("title")
        .text(function (d) {
            return d.data.title;
        });
};

let displayLines = function (data) {
    var dataFormed = d3.values(data).map(function (d, i) {
        var dataF = {};
        dataF.key = Object.keys(data)[i];
        dataF.value = d;
        return dataF;
    });

    var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
        y = d3.scaleLinear().rangeRound([height, 0]);

    var g = svgLines.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.values(dataFormed).map(function (d) {
        return d.key;
    }));
    y.domain([0, d3.max(dataFormed, function(d) { return d.value; })]);
    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(10, "%"))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Frequency");

    g.selectAll(".bar")
        .data(dataFormed)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d) {
            return x(d.key);
        })
        .attr("y", function (d) {
            return y(d.value);
        })
        .attr("width", x.bandwidth())
        .attr("height", function (d) {
            return height - y(d.value);
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

    displayLines(categoryMatching);


};

function processData(error, data) {
    if (error) throw error;
    currentData = data;

    let topValue = 0;
    let first = true;

    let root = d3.hierarchy({children: data})
        .sum(function (d) {
            // if (d.tags !== undefined) {
            //     let dataObj = JSON.parse(d.tags);
            // }
            //console.log(dataObj);
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
    buildDots(packed, topValue);

    buildBars(data);
}

visualizeData();

