/**
 * @class
 * @extends ve.ui.MWTransclusionOutlinePartWidget
 *
 * @constructor
 * @param {Object} [config]
 */
ve.ui.MWTransclusionOutlinePlaceholderWidget = function VeUiMWTransclusionOutlinePlaceholderWidget( config ) {
	// Initialize config
	config = $.extend( {
		icon: 'puzzle',
		label: ve.msg( 'visualeditor-dialog-transclusion-add-template' )
	}, config );

	// Parent constructor
	ve.ui.MWTransclusionOutlinePlaceholderWidget.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlinePlaceholderWidget, ve.ui.MWTransclusionOutlinePartWidget );
