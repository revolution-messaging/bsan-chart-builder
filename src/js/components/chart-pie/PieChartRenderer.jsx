// React
var React = require("react");
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var PropTypes = React.PropTypes;
var update = React.addons.update;

// Node modules
var d3 = require("d3");
var d4 = require("d4");

var clone = require("lodash/lang/clone");
var map = require("lodash/collection/map");
var assign = require("lodash/object/assign");
var each = require("lodash/collection/each");
var filter = require("lodash/collection/filter");
var reduce = require("lodash/collection/reduce");
var some = require("lodash/collection/some");

var ChartRendererMixin = require("../mixins/ChartRendererMixin.js");

// Flux actions
var ChartViewActions = require("../../actions/ChartViewActions");

// Svg components
var SvgRectLabel = require("../svg/SvgRectLabel.jsx");
var HiddenSvg = require("../svg/HiddenSvg.jsx");

// Helpers
var pie_chart = require("../../charts/cb-charts").pie_chart;
var help = require("../../util/helper.js");

var PieChartRenderer = React.createClass({

	propTypes: {
		displayConfig: PropTypes.shape({
			margin: PropTypes.object.isRequired,
			padding: PropTypes.object.isRequired,
			labelRectSize: PropTypes.number.isRequired,
			afterLegend: PropTypes.number.isRequired
		}).isRequired,
		chartProps: PropTypes.shape({
			chartSettings: PropTypes.array.isRequired,
			data: PropTypes.array.isRequired,
			scale: PropTypes.object.isRequired,
			_annotations: PropTypes.object,
			date: PropTypes.object,
			mobile: PropTypes.object
		}).isRequired,
		metadata: PropTypes.object,
		showMetadata: PropTypes.bool,
		editable: PropTypes.bool,
		useMobileSettings: PropTypes.bool
	},

	mixins: [ChartRendererMixin],

	render: function() {
		
		var _chartProps = this.props.chartProps;
		var displayConfig = this.props.displayConfig;
		var labelComponents;
		var dimensions = this.props.dimensions;

		//Dimensions of the chart area
		var chartAreaDimensions = {
			width: (dimensions.width -
				displayConfig.margin.left - displayConfig.margin.right -
				displayConfig.padding.left - displayConfig.padding.right),
			height: (dimensions.height -
				displayConfig.margin.top - displayConfig.margin.bottom -
				displayConfig.padding.top - displayConfig.padding.bottom)
		};

		// apply `chartSettings` to data
		var dataWithSettings = this._applySettingsToData(_chartProps);

		// compute margin based on existence of labels and title, based on default
		// margin set in config
		var labels = _chartProps._annotations.labels;
		var hasTitle = (this.props.metadata.title.length > 0 && this.props.showMetadata);

		return (
			<g>
				<PieChart
					key="pie-chart"
					chartProps={_chartProps}
					hasTitle={hasTitle}
					displayConfig={this.props.displayConfig}
					styleConfig={this.props.styleConfig}
					data={dataWithSettings}
					dimensions={dimensions}
					scale={scale}
					chartAreaDimensions={chartAreaDimensions}
					metadata={this.props.metadata}
				/>



				<PieChartLabels
					key="pie-chart-labels"
					chartProps={_chartProps}
					displayConfig={this.props.displayConfig}
					styleConfig={this.props.styleConfig}
					data={dataWithSettings}
					hasTitle={hasTitle}
					scale={scale}
					editable={this.props.editable}
					chartAreaDimensions={chartAreaDimensions}
					dimensions={dimensions}
				/>

			</g>
		);
	}
});

var PieChart = React.createClass({

	propTypes: {
		chartProps: PropTypes.object.isRequired,
		hasTitle: PropTypes.bool.isRequired,
		displayConfig: PropTypes.object.isRequired,
		styleConfig: PropTypes.object.isRequired,
		data: PropTypes.arrayOf(PropTypes.object).isRequired,
		dimensions: PropTypes.shape({
			width: PropTypes.number,
			height: PropTypes.number
		}).isRequired,
		scale: PropTypes.object.isRequired,
		chartAreaDimensions: PropTypes.object,
		metadata: PropTypes.object
	},

	getInitialState: function() {
		return {
			paddingTop: 0,
			labelsDragged: false
		}
	},

	componentDidMount: function() {
		// Draw chart once mounted
		var el = this.getDOMNode();

		if (this.props.chartProps.data.length === 0) {
			return;
		} else {
			// On component mount, delete any existing chart
			if (el.childNodes[0]) {
				el.removeChild(el.childNodes[0]);
			}
	
			drawPieChart(el, this._getChartState(this.props));
		}
	},

	shouldComponentUpdate: function(nextProps, nextState) {
		// always update by redrawing the chart
		var el = this.getDOMNode();

		drawPieChart(el, this._getChartState(nextProps));
		return false;
	},

	componentWillReceiveProps: function(nextProps) {
		var yOffset;
		if (nextProps.hasTitle) {
			yOffset = nextProps.displayConfig.margin.top + nextProps.displayConfig.afterTitle;
		} else {
			yOffset = nextProps.displayConfig.margin.top;
		}

		this.setState({
			yOffset: yOffset
		});
	},

	_getChartState: function(props) {

		// Generate and return the state needed to draw the chart. This is what will
		// passed to the d4/d3 draw function.
		var dateSettings;
		if (props.chartProps.scale.hasDate) {
			dateSettings = this.generateDateScale(props);
		}

		var computedPadding = computePadding(props);

		return {
			chartRenderer: pie_chart(),
			styleConfig: props.styleConfig,
			displayConfig: props.displayConfig,
			dateSettings: dateSettings,
			dimensions: props.dimensions,
			data: props.data,
			padding: computedPadding,
			chartProps: props.chartProps,
			scale: props.scale
		};
	},

	render: function() {
		// empty <svg:g> that will be drawn into using `this.getDOMNode()`
		return (
			<g className="renderer-chart">
			</g>
		);
	}

});

var PieChartLabels = React.createClass({

	propTypes: {
		chartProps: PropTypes.object.isRequired,
		hasTitle: PropTypes.bool.isRequired,
		displayConfig: PropTypes.object.isRequired,
		styleConfig: PropTypes.object.isRequired,
		data: PropTypes.arrayOf(PropTypes.object).isRequired,
		dimensions: PropTypes.shape({
			width: PropTypes.number,
			height: PropTypes.number
		}).isRequired,
		scale: PropTypes.object.isRequired,
		chartAreaDimensions: PropTypes.object,
		metadata: PropTypes.object
	},

	getInitialState: function() {
		return {
			yOffset: 10,
			undraggedLabels: {},
			dateScaleInfo: null
		};
	},

	componentWillReceiveProps: function(nextProps) {

		// Determine how far down vertically the labels should be placed, depending
		// on presence (or not) of a title
		var yOffset;
		if (nextProps.hasTitle) {
			yOffset = nextProps.displayConfig.margin.top + nextProps.displayConfig.afterTitle;
		} else {
			yOffset = nextProps.displayConfig.margin.top;
		}

		/*
		* We use this XYLabels component's state to save locations of undragged
		* labels. Dragged labels are saved to the parent store so that they can be
		* reloaded later.
		*/
		/* Make sure only undragged labels exist in XYLabels state, removing others */
		var updateUndragged = reduce(nextProps.chartProps._annotations.labels.values, function(obj, v, i) {
			if (!v.dragged) {
				if (this.state.undraggedLabels[i]) {
					obj[i] = this.state.undraggedLabels[i];
					return obj;
				} else {
					return obj;
				}
			} else {
				return obj;
			}
		}, {}, this);
		this.setState({
			yOffset: yOffset,
			undraggedLabels: updateUndragged,
			dateScaleInfo: nextProps.chartProps.scale.hasDate ? this.generateDateScale(nextProps) : null
		});
	},

	_getLabelYMax: function(labels, height) {
		var labelYMax = 0;

		// Find out how much vertical space the labels are taking up
		// by identifying the one with the largest `y` value
		// Only do this if the labels have not been dragged
		if (!labels.hasDragged) {
			each(this.props.chartProps.data, function(d, i) {
				var currLabel = labels[i];
				if (currLabel) {
					if (currLabel.y > labelYMax) {
						labelYMax = currLabel.y;
					}
				}
			}, this);
		}
		return labelYMax;
	},

	_computePadding: function(props) {
		return computePadding(props)
	},

	_enableDrag: function() {
		// tell the parent app that dragging has been enabled
		var annotations = this.props.chartProps._annotations;
		annotations.labels.hasDragged = true;
		ChartViewActions.updateChartProp("_annotations", annotations);
	},

	_handleLabelPositionUpdate: function(ix, pos) {
		/* If a label is dragged, update its position in the parent app */
		if (pos.dragged) {
			var values = clone(this.props.chartProps._annotations.labels.values);
			values[ix] = pos;
			var annotations = update(this.props.chartProps._annotations, { $merge: {
				labels: {
					values: values,
					hasDragged: this.props.chartProps._annotations.labels.hasDragged
				}
			}});
			ChartViewActions.updateChartProp("_annotations", annotations);
		/* Otherwise if undragged, update in XYLabls state */
		} else {
			var undragged = this.state.undraggedLabels;
			undragged[ix] = pos;
			this.setState(update(this.state, { $merge: {
				undraggedLabels: undragged
			}}));
			var labelYMax = this._getLabelYMax(undragged, this.props.dimensions.height);
		}
	},

	/**
	 * XYLabels#_getPrevUndraggedNode
	 * Recursively traverse through previous labels to find one that is undragged
	 * This is used to calculate the default placement of a label (ie to the
	 * right of the previous undragged node)
	 * @param {number} ix - The index of this undragged node in an array of undragged nodes
	 * @param {object[]} undraggedLabels - Position and size settings for all undraggedlabels
	 * @instance
	 * @memberof XYLabels
	 */
	_getPrevUndraggedNode: function(ix, undraggedLabels) {
		if (ix < 0) {
			return null;
		}

		if (undraggedLabels[ix]) {
			return undraggedLabels[ix];
		} else {
			return this._getPrevUndraggedNode(ix - 1, undraggedLabels);
		}
	},

	render: function() {
		// create array of SvgRectLabel components
		var labels = this.props.chartProps._annotations.labels;
		var styleConfig = this.props.styleConfig;
		var displayConfig = this.props.displayConfig;
		var props = this.props;
		var dimensions = props.dimensions;
		var padding = computePadding(props, this.props.dimensions.height);
		var isVertical = true;

		var labelConfig = {
			xMargin: displayConfig.labelXMargin,
			textMargin: displayConfig.labelTextMargin,
			rowHeight: displayConfig.labelRowHeight,
			rectSize: displayConfig.labelRectSize
		};

		var labelComponents = [];
		if (this.props.chartProps.data.length > 1) {
			each(this.props.chartProps.data, function(d, i) {
				var labelSettings = {};
				var prevNode = null;
				var chartSetting = this.props.chartProps.chartSettings[i];

				// Use existing positions if possible
				if (labels.values[i].dragged) {
					labelSettings = labels.values[i];
				} else {
					labelSettings = this.state.undraggedLabels[i];
					prevNode = this._getPrevUndraggedNode(i - 1, this.state.undraggedLabels);
				}

				var scales = this.props.scale;

				labelComponents.push(
					<SvgRectLabel
						key={i}
						text={chartSetting.label}
						labelConfig={labelConfig}
						dimensions={this.props.chartAreaDimensions}
						index={i}
						enableDrag={this._enableDrag}
						onPositionUpdate={this._handleLabelPositionUpdate}
						editable={props.editable}
						offset={{ x: displayConfig.margin.left, y: this.state.yOffset}}
						colorIndex={chartSetting.colorIndex}
						settings={labelSettings}
						prevNode={prevNode}
						scale={scale}
						vertical={isVertical}
					/>
				);
			}, this);
		}
		return (
			<g
				ref="chartAnnotations"
				className="renderer-annotations"
				transform={"translate(" + [displayConfig.margin.left, this.state.yOffset] + ")" }
			>
				{labelComponents}
			</g>
		);
	}

});

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

function drawPieChart(el, state) {

	var chartProps = state.chartProps;
	var dateSettings = state.dateSettings;
	var displayConfig = state.displayConfig;
	var styleConfig = state.styleConfig;
	var hasOtherAxis = chartProps._numSecondaryAxis > 0;
	var scale = state.scale;

	var extraPadding = {
		top: chartProps.extraPadding.top,
		right: chartProps.extraPadding.right,
		bottom: chartProps.extraPadding.bottom,
		left: chartProps.extraPadding.left
	};

	var w = state.dimensions.width;
	var h = state.dimensions.height;
	var r = w/5;
	var color = d3.scale.category20c();

	var data = state.data;

	var vis = d3.select(el)
		.append("svg:svg")
		.data([data])
		.attr("width", w)
		.attr("height", h)
		.append("svg:g")
		.attr("transform", "translate(" + w/2 + "," + h/2 + ")");
	
	var pie = d3.layout.pie().value(function(d){
		return d.values[0].value;
	});

	// declare an arc generator function
	var arc = d3.svg.arc().outerRadius(r);

	 function getTotal(){
		var counter = 0;
		var total = 0;
		while(counter<=state.data.length-1) {
			total+=state.data[counter].values[0].value;
			counter++;
		}
		return total;
	}

	var totalValues = getTotal();
	
	// select paths, use arc generator to draw
	var arcs = vis.selectAll("g.slice").data(pie).enter().append("svg:g").attr("class", "slice");
	arcs.append("svg:path")
		.attr("data-color-index", function(d, i){
	    	return state.chartProps.chartSettings[i].colorIndex;
	    })
	    .attr("d", function (d) {
	        // log the result of the arc generator to show how cool it is :)
	        return arc(d);
	    });

	// add the text
	arcs.append("svg:text").attr('class','slice-text').attr("transform", function(d){
			d.innerRadius = 0;
			d.outerRadius = r;
    return "translate(" + arc.centroid(d) + ")";}).attr("text-anchor", "middle").text( function(d) {
    return Math.round(parseInt(d.value)/parseInt(totalValues)*100) + '%';}
		);

}

function computePadding(props, chartHeight) {
	var labels = props.chartProps._annotations.labels;
	var displayConfig = props.displayConfig;
	var _top = (props.labelYMax * props.chartAreaDimensions.height) + displayConfig.afterLegend;

	if (props.hasTitle) {
		_top += displayConfig.afterTitle;
	}

	// Maintain space between legend and chart area unless all legend labels
	// have been dragged
	var allLabelsDragged = reduce(labels.values, function(prev, value) {
		return (prev === true && value.dragged === true);
	}, true);

	// Reduce top padding if all labels or dragged or there is only one series,
	// meaning no label will be shown
	if (allLabelsDragged || props.chartProps.data.length === 1) {
		_top -= displayConfig.afterLegend;
	}
	return {
		top: _top,
		right: displayConfig.padding.right,
		bottom: displayConfig.padding.bottom,
		left: displayConfig.padding.left
	};
}

module.exports = PieChartRenderer;
