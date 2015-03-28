/*!
 * VisualEditor MWTransclusionContextItem class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Context item for a MWTransclusion.
 *
 * @class
 * @extends ve.ui.ContextItem
 *
 * @constructor
 * @param {ve.ui.Context} context Context item is in
 * @param {ve.dm.Model} model Model item is related to
 * @param {Object} config Configuration options
 */
ve.ui.MWTransclusionContextItem = function VeMWTransclusionContextItem() {
	// Parent constructor
	ve.ui.MWTransclusionContextItem.super.apply( this, arguments );

	// Initialization
	this.$element.addClass( 've-ui-mwTransclusionContextItem' );
	if ( !this.model.isSingleTemplate() ) {
		this.setLabel( ve.msg( 'visualeditor-dialogbutton-transclusion-tooltip' ) );
	}
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionContextItem, ve.ui.ContextItem );

/* Static Properties */

ve.ui.MWTransclusionContextItem.static.name = 'transclusion';

ve.ui.MWTransclusionContextItem.static.icon = 'template';

ve.ui.MWTransclusionContextItem.static.label =
	OO.ui.deferMsg( 'visualeditor-dialogbutton-template-tooltip' );

ve.ui.MWTransclusionContextItem.static.modelClasses = [ ve.dm.MWTransclusionNode ];

ve.ui.MWTransclusionContextItem.static.commandName = 'transclusion';

/**
 * Only display item for single-template transclusions of these templates.
 *
 * @property {string|string[]|null}
 * @static
 * @inheritable
 */
ve.ui.MWTransclusionContextItem.static.template = null;

/* Static Methods */

/**
 * @static
 * @localdoc Sharing implementation with ve.ui.MWTransclusionDialogTool
 */
ve.ui.MWTransclusionContextItem.static.isCompatibleWith =
	ve.ui.MWTransclusionDialogTool.static.isCompatibleWith;

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWTransclusionContextItem.prototype.getDescription = function () {
	return ve.msg(
		'visualeditor-dialog-transclusion-contextitem-description',
		ve.ce.MWTransclusionNode.static.getDescription( this.model )
	);
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.MWTransclusionContextItem );
