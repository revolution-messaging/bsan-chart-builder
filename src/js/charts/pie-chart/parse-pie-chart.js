var clone = require("lodash/lang/clone");
var map = require("lodash/collection/map");
var assign = require("lodash/object/assign");
var each = require("lodash/collection/each");
var filter = require("lodash/collection/filter");

var dataBySeries = require("../../util/parse-data-by-series");
var help = require("../../util/helper");

/**
 * see [ChartConfig#parser](#chartconfig/parser)
 * @see ChartConfig#parser
 * @instance
 * @memberof xy_config
 */
function parsePieChart(config, _chartProps, callback, parseOpts) {

	// Build chart settings from defaults or provided settings

	parseOpts = parseOpts || {};
	// clone so that we aren't modifying original
	// this can probably be avoided by applying new settings differently
	var chartProps = JSON.parse(JSON.stringify(_chartProps));

	var bySeries = dataBySeries(chartProps.input.raw, { checkForDate: true });
	var labels = chartProps._annotations.labels;

	var chartSettings = map(bySeries.series, function(dataSeries, i) {
		var settings;

		// Set setting for value
		if (chartProps.chartSettings[i]) {
			settings = chartProps.chartSettings[i];
		} else {
			settings = clone(config.defaultProps.chartProps.chartSettings[0]);
			settings.colorIndex = i;
		}

		settings.label = settings.label || dataSeries.name;	

		var values = map(dataSeries.values, function(d) {
			return +d.value;
		});

		return settings;
	});

	labels.values = map(bySeries.series, function(dataSeries, i) {
		if (labels.values[i]) {
			return assign({}, { name: chartSettings[i].label}, labels.values[i]);
		} else {
			return {
				name: dataSeries.name
			};
		}
	});

	var scale = {
		type: 'pie'
	}

	var newChartProps = assign(chartProps, {
		chartSettings: chartSettings,
		scale: scale,
		input: bySeries.input,
		data: bySeries.series
	});

	if (callback) {
		callback(newChartProps);
	} else {
		return newChartProps;
	}
}

module.exports = parsePieChart;
