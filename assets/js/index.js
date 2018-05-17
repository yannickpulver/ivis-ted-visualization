const canvHeight = 600, canvWidth = 800;

const svg = d3.select("#canvas").append("svg")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .style("border", "1px solid");

const margin = {top: 0, right: 0, bottom: 0, left: 0};
const width = canvWidth - margin.left - margin.right;
const height = canvHeight - margin.top - margin.bottom;

var format = d3.format(",d");


var pack = d3.pack()
    .size([width, height])
    .padding(1.5);


function visualizeData() {
    d3.csv("data/kaggle/ted_main.csv", function (d) {
        d.views = +d.views;
        if (d.views) return d;
    }, function (error, classes) {
        if (error) throw error;

        var topValue = 0;
        var first = true;

        var root = d3.hierarchy({children: classes})
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

        var packed = pack(root);

        var color = d3.scaleLinear()
            .domain([1, topValue])
            .range(['#ffb0ae', '#e53025'])
            .interpolate(d3.interpolateHcl);

        var node = svg.selectAll(".node")
            .data(packed.leaves())
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        node.append("circle")
            .attr("id", function (d) {
                return d.id;
            })
            .attr("r", function (d) {
                return d.r;
            })
            .style("fill", function (d) {
                return color(d.value);
            });

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
    });
}

visualizeData();

