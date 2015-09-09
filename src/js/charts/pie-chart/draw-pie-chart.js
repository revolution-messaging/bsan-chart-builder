if (process.env.NODE_ENV !== "test") {
	var d4 = require("d4");
}

var filter = require("lodash/collection/filter");
var each = require("lodash/collection/each");

var chartStyle = require("../../config/chart-style");
var cb_mixins = require("../cb-d4-mixins.js");
var help = require("../../util/helper.js");

// TODO put this in `xy-config.js`
var pie_chart_config = {};

var mixin = [
	{
		"name": "slices"
	},
	cb_mixins.series_label
];


var using = {
	slices: function(line,location,singleLineDotThresh,totalLinePoints) {

		var isPrimary = (location === "primary");
		var scale = isPrimary ? this.left : this.right;

		line.beforeRender(function(data) {
			var isolated_data = [];

			each(data, function(d,i) {
				var isProperType = d.type == "line";
				var isProperAxis = (d.altAxis === false && isPrimary) || (d.altAxis === true && !isPrimary);

				if(isProperType && isProperAxis) {
					d.index = i;
					isolated_data.push(d);
					totalLinePoints += d.values.length;
					if (d.values.length < pie_chart_config.lineDotsThresholdSingle) {
						singleLineDotThresh = true;
					}
				}
			});

			return isolated_data;
		});

		line.x(function(d) {
			if (this.x.$scale == "time") {
				return this.x(d[this.x.$key]);
			} else {
				return this.x(d[this.x.$key]) + this.x.rangeBand() / 2;
			}
		});

		line.y(function(d){
			return scale(d[scale.$key]);
		});

		line.defined(function(d){return d.value || d.value === 0;});

		line.afterRender(function() {
			this.container.selectAll((isPrimary ? "." : ".other-" ) + "lines g.line, .other-lines g.line")
				.each(function(d,i) {
					var index = !isNaN(d.colorIndex) ? d.colorIndex : d.index;
					d3.select(this).attr("data-color-index", index);
					d.prevIndex = index;
				});
		
		});
	}

};

var pie_chart = d4.chart("pie-chart", function() {

	var pieChart;
	return pieChart;

});

module.exports = pie_chart;
