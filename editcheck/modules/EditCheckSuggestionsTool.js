/**
 * @class
 * @extends ve.ui.ToolbarDialogTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.EditCheckSuggestionsTool = function VeUiEditCheckSuggestionsTool() {
	ve.ui.EditCheckSuggestionsTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.EditCheckSuggestionsTool, ve.ui.ToolbarDialogTool );
ve.ui.EditCheckSuggestionsTool.static.name = 'editCheckSuggestions';
ve.ui.EditCheckSuggestionsTool.static.group = 'notices';
ve.ui.EditCheckSuggestionsTool.static.icon = 'lightbulb';
ve.ui.EditCheckSuggestionsTool.static.title = OO.ui.deferMsg( 'editcheck-toolbar-suggestions-title' );
ve.ui.EditCheckSuggestionsTool.static.autoAddToCatchall = false;

ve.ui.EditCheckSuggestionsTool.prototype.onUpdateState = function () {
	this.setDisabled( !mw.editcheck.suggestions );
	this.setActive( this.toolbar.getSurface().target.editcheckController.suggestionsMode );
};

ve.ui.EditCheckSuggestionsTool.prototype.onSelect = function () {
	const controller = this.toolbar.getSurface().target.editcheckController;
	controller.toggleSuggestionsMode();
	this.setActive( controller.suggestionsMode );
	ve.track( 'activity.' + this.getName(), { action: `toggled-${ controller.suggestionMode ? 'on' : 'off' }` } );
	// This would be done by the parent, but we're overriding it:
	ve.track( 'activity.' + this.getName(), { action: 'tool-used' } );
};

ve.ui.toolFactory.register( ve.ui.EditCheckSuggestionsTool );
