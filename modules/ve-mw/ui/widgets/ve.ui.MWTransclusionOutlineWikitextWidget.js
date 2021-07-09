/**
 * @class
 * @extends ve.ui.MWTransclusionOutlinePartWidget
 *
 * @constructor
 * @param {Object} [config]
 */
ve.ui.MWTransclusionOutlineWikitextWidget = function VeUiMWTransclusionOutlineWikitextWidget( config ) {
	// Initialize config
	config = $.extend( {
		icon: 'wikiText',
		label: ve.msg( 'visualeditor-dialog-transclusion-content' )
	}, config );

	// Parent constructor
	ve.ui.MWTransclusionOutlineWikitextWidget.super.call( this, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineWikitextWidget, ve.ui.MWTransclusionOutlinePartWidget );
