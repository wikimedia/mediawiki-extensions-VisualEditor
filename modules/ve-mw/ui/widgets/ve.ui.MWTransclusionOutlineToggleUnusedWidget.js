/**
 * Button widget to toggle unused fields
 *
 * @class
 * @extends OO.ui.ButtonWidget
 *
 * @constructor
 */
ve.ui.MWTransclusionOutlineToggleUnusedWidget = function VeUiMWTransclusionOutlineToggleUnusedWidget() {
	// Parent constructor
	ve.ui.MWTransclusionOutlineToggleUnusedWidget.super.call( this, {
		label: ve.msg( 'visualeditor-dialog-transclusion-filter-hide-unused' ),
		flags: [ 'progressive' ],
		framed: false
	} );

	// Events
	this.connect( this, {
		toggle: 'onToggle',
		click: 'onClick'
	} );

	// Initialization
	this.$element.addClass( 've-ui-mwTransclusionOutlineToggleUnusedWidget' );
	this.showUnusedFields = true;
};

/* Inheritance */
OO.inheritClass( ve.ui.MWTransclusionOutlineToggleUnusedWidget, OO.ui.ButtonWidget );

/* Events */

/**
 * @event toggleUnusedFields
 * Emitted when the visibility for unused fields should be (re)applied.
 */

/**
 * Handles clicks on the button by mouse or keyboard interaction.
 *
 * @private
 * @fires toggleUnusedFields
 */
ve.ui.MWTransclusionOutlineToggleUnusedWidget.prototype.onClick = function () {
	this.toggleUnusedParameters();
};

/**
 * @param {boolean} [showUnused]
 * @fires toggleUnusedFields
 */
ve.ui.MWTransclusionOutlineToggleUnusedWidget.prototype.toggleUnusedParameters = function ( showUnused ) {
	showUnused = showUnused === undefined ? !this.showUnusedFields : showUnused;
	if ( showUnused !== this.showUnusedFields ) {
		this.showUnusedFields = showUnused;
		this.setLabel( ve.msg( this.showUnusedFields ?
			'visualeditor-dialog-transclusion-filter-hide-unused' :
			'visualeditor-dialog-transclusion-filter-show-all'
		) );
		this.emit( 'toggleUnusedFields', this.showUnusedFields );
	}
};

/**
 * Handles toggling the visibility of the button.
 *
 * @private
 * @param {boolean} visible
 * @fires toggleUnusedFields
 */
ve.ui.MWTransclusionOutlineToggleUnusedWidget.prototype.onToggle = function ( visible ) {
	if ( visible ) {
		this.emit( 'toggleUnusedFields', this.showUnusedFields );
	}
};
