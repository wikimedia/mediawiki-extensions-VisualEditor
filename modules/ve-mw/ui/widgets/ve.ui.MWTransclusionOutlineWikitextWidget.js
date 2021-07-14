/**
 * @class
 * @extends ve.ui.MWTransclusionOutlinePartWidget
 *
 * @constructor
 * @param {ve.dm.MWTransclusionContentModel} content
 * @param {Object} [config]
 */
ve.ui.MWTransclusionOutlineWikitextWidget = function VeUiMWTransclusionOutlineWikitextWidget( content, config ) {
	// Initialize config
	config = $.extend( {
		icon: 'wikiText',
		label: ve.msg( 'visualeditor-dialog-transclusion-content' )
	}, config );

	// Parent constructor
	ve.ui.MWTransclusionOutlineWikitextWidget.super.call( this, content, config );

	this.content = content;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineWikitextWidget, ve.ui.MWTransclusionOutlinePartWidget );
