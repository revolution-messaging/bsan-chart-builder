/*
 * ### Editor interface for XY chart type
 */

var React = require("react");
var PropTypes = React.PropTypes;
var PureRenderMixin = React.addons.PureRenderMixin;
var update = React.addons.update;
var cx = React.addons.classSet;
var clone = require("lodash/lang/clone");
var map = require("lodash/collection/map");
var keys = require("lodash/object/keys");
var each = require("lodash/collection/each");

var dateParsers = require("../../util/process-dates").dateParsers;

/* Shared Chartbuilder components */
var DataInput = require("../shared/DataInput.jsx");
var DateScaleSettings = require("../shared/DateScaleSettings.jsx");
var XY_yScaleSettings = require("../shared/XY_yScaleSettings.jsx");

/* Chartbuilder UI components */
var chartbuilderUI = require("chartbuilder-ui");
var Button = chartbuilderUI.Button;
var ButtonGroup = chartbuilderUI.ButtonGroup;
var ColorPicker = chartbuilderUI.ColorPicker;
var Dropdown = chartbuilderUI.Dropdown;
var LabelledTangle = chartbuilderUI.LabelledTangle;
var TextInput = chartbuilderUI.TextInput;
var Toggle = chartbuilderUI.Toggle;

var ChartEditorMixin = require("../mixins/ChartEditorMixin.js");

/* Available XY chart type options */
var typeOptions = [];

/* Available XY axis options */
var axisOptions = [];

/**
 * ### Editor interface for a XY chart
 * @property {object} chartProps - Properties used to draw this chart
 * @property {number} numSteps - Allow the rendered component to interacted with and edited
 * @instance
 * @memberof editors
 */
var PieChartEditor = React.createClass({

	propTypes: {
		chartProps: PropTypes.shape({
			input: PropTypes.shape({
				raw: PropTypes.string,
				status: PropTypes.string,
				valid: PropTypes.bool
			}).isRequired,
			chartSettings: PropTypes.array,
			data: PropTypes.array,
			scale: PropTypes.object,
			_annotations: PropTypes.object
		}),
		numSteps: PropTypes.number
	},

	mixins: [ChartEditorMixin],

	getDefaultProps: function() {
		return {
			numSteps: 1
		};
	},

	render: function() {
		var chartProps = this.props.chartProps;
		var scaleSettings = [];

		/*
		 * If all but one series is set to secondary axis, don't allow secondary
		 * axis option
		*/

		/* Create a settings component for each data series (column) */
		var chartSettings = map(chartProps.chartSettings, function(chartSetting, i) {
			return <PieChart_chartSettings
				chartSettings={chartProps.chartSettings}
				onUpdate={this._handlePropUpdate.bind(null, "chartSettings")}
				onUpdateReparse={this._handlePropAndReparse.bind(null, "chartSettings")}
				numColors={this.props.numColors}
				index={i}
				key={i}
			/>
		}, this);

		return (
			<div className="pie-chart-editor">
				<div className="editor-options">
					<h2>
						<span className="step-number">2</span>
						<span>Input your data</span>
					</h2>
					<DataInput
						chartProps={chartProps}
						className="data-input"
					/>
				</div>
				<div className="editor-options">
					
					<h2>
						<span className="step-number">3</span>
						<span>Set series options</span>
					</h2>

					{chartSettings}
				
				</div>
			</div>
		);
	}

});

/**
 * When labels are dragged, this component appears and allows you to reset them
 * @property {object} annotations - Current `chartProps._annotations`
 * @property {function} onUpdate - Callback that passes a reset version of
 * `chartProps._annotation`
 * @instance
 * @memberof XYEditor
 */

// var XY_resetLabels = React.createClass({

// 	_handleLabelReset: function() {
// 		/*
// 		 * To reset labels, delete all `pos.x` and `pos.y` from the label object.
// 		 * We will keep the width cached as it is used to calculate distance from a
// 		 * previous label
// 		*/
// 		var labels = clone(this.props.annotations.labels, true);
// 		each(keys(labels.values), function(labelKey, i) {
// 			if (labelKey !== "hasDragged") {
// 				var currLabel = labels.values[i];
// 				if (currLabel.dragged == true) {
// 					labels.values[i] = {
// 						dragged: false,
// 						name: currLabel.name,
// 						width: currLabel.width
// 					};
// 				}
// 			}
// 		});
// 		/* Tell the app that the labels are no longer dragged */
// 		labels.hasDragged = false;
// 		var annotations = update(this.props.annotations, { $merge: {
// 			labels: labels
// 		}});
// 		this.props.onUpdate(annotations);
// 	},

// 	render: function() {
// 		var className = cx({
// 			"label-reset": true,
// 			"active": this.props.annotations.labels.hasDragged // only show if we've dragged
// 		});

// 		return (
// 			<Button
// 				onClick={this._handleLabelReset}
// 				className={className}
// 				text={"Reset labels"}
// 			/>
// 		);
// 	}

// });

/**
 * Series-specific settings for each column in data
 * @property {boolean} allowSecondaryAxis - Should a secondary axis be allowed
 * @property {object[]} chartSettings - Current settings for data series
 * @property {function} onUpdate - Callback that handles new series settings
 * @property {function} onUpdateReparse - Callback that handles new series settings,
 * but which need to be sent back to `parse-xy`
 * @property {number} numColors - Total number of possible colors
 * @instance
 * @memberof XYEditor
 */
var PieChart_chartSettings = React.createClass({

	propTypes: {
		chartSettings: PropTypes.arrayOf(PropTypes.object),
		numColors: PropTypes.number,
		onUpdate: PropTypes.func,
		onUpdateReparse: PropTypes.func,
	},

	_handleSettingsUpdate: function(ix, k, v) {
		/* Clone the array of objects so that we dont mutate existing state */
		var chartSettings = map(this.props.chartSettings, clone);
		/* We need the index (ix) of the settings object to know which to update */
		chartSettings[ix][k] = v;
		/* `axis` and `colorIndex` require reparsing the input and splitting it up */
		this.props.onUpdateReparse(chartSettings);
	},

	render: function() {
		var chartSetting = this.props.chartSettings[this.props.index];
		return (
			<div className="series-control">
				<TextInput
					type="text"
					value={chartSetting.label}
					onChange={this._handleSettingsUpdate.bind(null, this.props.index, "label")}
					className={"series-label-input series-label-input-" + chartSetting.colorIndex}
				/>

				<h3 className={"series-label series-label-" + chartSetting.colorIndex}>
				</h3>

				<div className="section axis-color">
					<div className="section colorsection">
						<label>Color</label>
						<ColorPicker
							onChange={this._handleSettingsUpdate.bind(null, this.props.index, "colorIndex")}
							numColors={this.props.numColors}
							index={this.props.index}
							colorIndex={chartSetting.colorIndex}
						/>
					</div>
				</div>

				<div className="clearfix"></div>
			

			</div>
		);
	}
});

module.exports = PieChartEditor;