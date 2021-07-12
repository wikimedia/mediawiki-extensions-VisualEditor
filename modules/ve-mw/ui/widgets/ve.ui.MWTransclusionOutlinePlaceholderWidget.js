/**
 * @class
 * @extends ve.ui.MWTransclusionOutlinePartWidget
 *
 * @constructor
 * @param {ve.dm.MWTemplatePlaceholderModel} placeholder
 * @param {Object} [config]
 */
ve.ui.MWTransclusionOutlinePlaceholderWidget = function VeUiMWTransclusionOutlinePlaceholderWidget( placeholder, config ) {
	var label = placeholder.getTransclusion().getParts().length === 1 ?
		'visualeditor-dialog-transclusion-template-search' :
		'visualeditor-dialog-transclusion-add-template';

	// Initialize config
	config = $.extend( {
		icon: 'puzzle',
		// The following messages are used here:
		// * visualeditor-dialog-transclusion-template-search
		// * visualeditor-dialog-transclusion-add-template
		label: ve.msg( label )
	}, config );

	// Parent constructor
	ve.ui.MWTransclusionOutlinePlaceholderWidget.super.call( this, config );

	this.placeholder = placeholder;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlinePlaceholderWidget, ve.ui.MWTransclusionOutlinePartWidget );
