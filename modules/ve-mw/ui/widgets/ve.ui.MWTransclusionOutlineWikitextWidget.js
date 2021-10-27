/**
 * @class
 * @extends ve.ui.MWTransclusionOutlinePartWidget
 *
 * @constructor
 * @param {ve.dm.MWTransclusionContentModel} content
 */
ve.ui.MWTransclusionOutlineWikitextWidget = function VeUiMWTransclusionOutlineWikitextWidget( content ) {
	// Parent constructor
	ve.ui.MWTransclusionOutlineWikitextWidget.super.call( this, content, {
		icon: 'wikiText',
		label: ve.msg( 'visualeditor-dialog-transclusion-wikitext' ),
		ariaDescriptionSelected: ve.msg( 'visualeditor-dialog-transclusion-wikitext-widget-aria-selected' ),
		ariaDescriptionUnselected: ve.msg( 'visualeditor-dialog-transclusion-wikitext-widget-aria' )
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineWikitextWidget, ve.ui.MWTransclusionOutlinePartWidget );
