if (process.env.NODE_ENV !== "test") {
	var d4 = require("d4");
}

var filter = require("lodash/collection/filter");
var each = require("lodash/collection/each");

var chartStyle = require("../../config/chart-style");
var cb_mixins = require("../cb-d4-mixins.js");
var help = require("../../util/helper.js");

var pie_chart = d4.chart("pie-chart", function() {

	var pieChart;
	return pieChart;

});

module.exports = pie_chart;
