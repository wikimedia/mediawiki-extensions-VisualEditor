/*!
 * VisualEditor MediaWiki UserInterface edit mode tool classes.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki UserInterface edit mode tool.
 *
 * @class
 * @abstract
 * @extends ve.ui.MWPopupTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Config options
 */
ve.ui.MWEditModeTool = function VeUiMWEditModeTool( toolGroup, config ) {
	var tool = this,
		$content = $( '<p>' ).text( mw.msg( 'visualeditor-mweditmodewt-popup-body' ) ),
		showAgainLayout, showAgainCheckbox;
	ve.ui.MWPopupTool.call( this, mw.msg( 'visualeditor-mweditmodewt-popup-title' ), toolGroup, config );

	if ( !mw.user.isAnon() ) {
		showAgainCheckbox = new OO.ui.CheckboxInputWidget()
			.on( 'change', function ( value ) {
				var configValue = value ? '1' : '';
				new mw.Api().saveOption( 'visualeditor-hidevisualswitchpopup', configValue );
				mw.user.options.set( 'visualeditor-hidevisualswitchpopup', configValue );
			} );

		showAgainLayout = new OO.ui.FieldLayout( showAgainCheckbox, {
			align: 'inline',
			label: mw.msg( 'visualeditor-mweditmodeve-showagain' )
		} );
		$content = $content.add( showAgainLayout.$element );
	}

	this.popup.$body
		.addClass( 've-init-mw-editSwitch' )
		.append( $content );
	this.popup.$element.click( function () {
		tool.getPopup().toggle( false );
	} );
	this.$element.append( this.popup.$element );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWEditModeTool, ve.ui.MWPopupTool );

/* Static Properties */

ve.ui.MWEditModeTool.static.group = 'editMode';

ve.ui.MWEditModeTool.static.autoAddToCatchall = false;

ve.ui.MWEditModeTool.static.autoAddToGroup = false;

/* Methods */

/** */
ve.ui.MWEditModeTool.prototype.onSelect = function () {
	// Bypass OO.ui.PopupTool.prototype.onSelect
	OO.ui.Tool.prototype.onSelect.apply( this, arguments );
};

ve.ui.MWEditModeTool.prototype.onUpdateState = function () {
	// Parent method
	ve.ui.MWEditModeTool.super.prototype.onUpdateState.apply( this, arguments );

	this.setActive( false );
	this.setDisabled( false );
};

/**
 * MediaWiki UserInterface edit mode source tool.
 *
 * @class
 * @extends ve.ui.MWEditModeTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Config options
 */
ve.ui.MWEditModeSourceTool = function VeUiMWEditModeSourceTool() {
	ve.ui.MWEditModeSourceTool.super.apply( this, arguments );
};
OO.inheritClass( ve.ui.MWEditModeSourceTool, ve.ui.MWEditModeTool );
ve.ui.MWEditModeSourceTool.static.name = 'editModeSource';
ve.ui.MWEditModeSourceTool.static.icon = 'wikiText';
ve.ui.MWEditModeSourceTool.static.title =
	OO.ui.deferMsg( 'visualeditor-mweditmodesource-tool' );
/**
 * @inheritdoc
 */
ve.ui.MWEditModeSourceTool.prototype.onSelect = function () {
	this.toolbar.getTarget().editSource();
	this.setActive( false );
};
ve.ui.toolFactory.register( ve.ui.MWEditModeSourceTool );
