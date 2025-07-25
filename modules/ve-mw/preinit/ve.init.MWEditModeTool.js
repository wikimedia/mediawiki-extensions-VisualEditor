/*!
 * MediaWiki edit mode tool classes.
 *
 * These versions of the tools should only be used when building
 * a toolbar **outside** of VE, e.g. the toolbar built in
 * ve.init.mw.DesktopArticleTarget.init.js that is appended to the
 * WikiEditor toolbar.
 *
 * When using a toolbar in VE, always use the ve.ui.MWEditModeTool
 * classes.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

mw.libs.ve = mw.libs.ve || {};

/**
 * MediaWiki edit mode tool.
 *
 * @class
 * @abstract
 * @extends OO.ui.Tool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Config options
 */
mw.libs.ve.MWEditModeTool = function VeUiMWEditModeTool() {
	// Parent constructor
	mw.libs.ve.MWEditModeTool.super.apply( this, arguments );

	this.modeAvailable = null;
};

/* Inheritance */

OO.inheritClass( mw.libs.ve.MWEditModeTool, OO.ui.Tool );

/* Static Properties */

mw.libs.ve.MWEditModeTool.static.editMode = null;
mw.libs.ve.MWEditModeTool.static.group = 'editMode';
mw.libs.ve.MWEditModeTool.static.autoAddToCatchall = false;
mw.libs.ve.MWEditModeTool.static.unavailableTooltip = null;

/* Methods */

/**
 * Switch editors
 */
mw.libs.ve.MWEditModeTool.prototype.switch = function () {
	this.toolbar.emit( 'switchEditor', this.constructor.static.editMode );
};

/**
 * Get current edit mode
 *
 * @return {string} Current edit mode
 */
mw.libs.ve.MWEditModeTool.prototype.getMode = function () {
	return 'source';
};

/**
 * Check if edit mode is available
 *
 * @param {string} Edit mode
 * @return {boolean} Edit mode is available
 */
mw.libs.ve.MWEditModeTool.prototype.isModeAvailable = function () {
	return true;
};

/**
 * @inheritdoc
 */
mw.libs.ve.MWEditModeTool.prototype.onSelect = function () {
	if ( this.getMode() !== this.constructor.static.editMode ) {
		this.switch();
	}
	this.setActive( this.getMode() === this.constructor.static.editMode );
};

/**
 * @inheritdoc
 */
mw.libs.ve.MWEditModeTool.prototype.onUpdateState = function () {
	const modeAvailable = this.isModeAvailable( this.constructor.static.editMode );

	// Change title if state has changed
	if ( this.modeAvailable !== modeAvailable ) {
		this.$link.attr( 'title', modeAvailable ?
			OO.ui.resolveMsg( this.constructor.static.title ) :
			OO.ui.resolveMsg( this.constructor.static.unavailableTooltip )
		);
		this.setDisabled( !modeAvailable );
		this.modeAvailable = modeAvailable;
	}
	this.setActive( this.getMode() === this.constructor.static.editMode );
};

/**
 * MediaWiki edit mode visual tool.
 *
 * @class
 * @extends mw.libs.ve.MWEditModeTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Config options
 */
mw.libs.ve.MWEditModeVisualTool = function VeUiMWEditModeVisualTool() {
	// Parent constructor
	mw.libs.ve.MWEditModeVisualTool.super.apply( this, arguments );
};

OO.inheritClass( mw.libs.ve.MWEditModeVisualTool, mw.libs.ve.MWEditModeTool );

mw.libs.ve.MWEditModeVisualTool.static.editMode = 'visual';
mw.libs.ve.MWEditModeVisualTool.static.name = 'editModeVisual';
mw.libs.ve.MWEditModeVisualTool.static.icon = 'eye';
mw.libs.ve.MWEditModeVisualTool.static.title =
	OO.ui.deferMsg( 'visualeditor-mweditmodeve-tool-current' );
mw.libs.ve.MWEditModeVisualTool.static.unavailableTooltip =
	OO.ui.deferMsg( 'visualeditor-mweditmodeve-tool-unavailable' );

/**
 * @inheritdoc
 */
mw.libs.ve.MWEditModeVisualTool.prototype.isModeAvailable = function () {
	// eslint-disable-next-line no-jquery/no-global-selector
	if ( $( 'input[name=wpSection]' ).val() === 'new' ) {
		// Adding a new section is not supported in visual mode
		return false;
	}
	if ( !mw.config.get( 'wgVisualEditorConfig' ).namespaces.includes( new mw.Title( mw.config.get( 'wgRelevantPageName' ) ).getNamespaceId() ) ) {
		return false;
	}
	// Parent method
	return mw.libs.ve.MWEditModeVisualTool.super.prototype.isModeAvailable.apply( this, arguments );
};

/**
 * MediaWiki edit mode source tool.
 *
 * @class
 * @extends mw.libs.ve.MWEditModeTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Config options
 */
mw.libs.ve.MWEditModeSourceTool = function VeUiMWEditModeSourceTool() {
	// Parent constructor
	mw.libs.ve.MWEditModeSourceTool.super.apply( this, arguments );
};

OO.inheritClass( mw.libs.ve.MWEditModeSourceTool, mw.libs.ve.MWEditModeTool );

mw.libs.ve.MWEditModeSourceTool.static.editMode = 'source';
mw.libs.ve.MWEditModeSourceTool.static.name = 'editModeSource';
mw.libs.ve.MWEditModeSourceTool.static.icon = 'wikiText';
mw.libs.ve.MWEditModeSourceTool.static.title =
	OO.ui.deferMsg( 'visualeditor-mweditmodesource-tool-current' );
mw.libs.ve.MWEditModeSourceTool.static.unavailableTooltip =
	OO.ui.deferMsg( 'visualeditor-mweditmodesource-tool-unavailable' );
