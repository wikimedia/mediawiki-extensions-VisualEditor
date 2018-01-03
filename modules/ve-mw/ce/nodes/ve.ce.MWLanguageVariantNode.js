/*!
 * VisualEditor ContentEditable MWLanguageVariantNode class.
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MediaWiki language variant node, used for
 * LanguageConverter markup.
 *
 * @class
 * @abstract
 * @extends ve.ce.LeafNode
 * @mixins ve.ce.FocusableNode
 * @constructor
 * @param {ve.dm.MWLanguageVariantNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWLanguageVariantNode = function VeCeMWLanguageVariantNode( model, config ) {
	// Parent constructor
	ve.ce.MWLanguageVariantNode.super.call( this, model, config );

	// Mixin constructors
	ve.ce.FocusableNode.call( this, this.$element, config );

	// DOM changes
	this.$element.addClass( 've-ce-mwLanguageVariantNode' );
	this.$holder = this.appendHolder(); // null for a hidden node

	// Events
	this.model.connect( this, { update: 'onUpdate' } );
	this.model.connect( this, { update: 'updateInvisibleIcon' } );

	// Initialization
	this.onUpdate();
};

/* Inheritance */

OO.inheritClass( ve.ce.MWLanguageVariantNode, ve.ce.LeafNode );

OO.mixinClass( ve.ce.MWLanguageVariantNode, ve.ce.FocusableNode );

/* Static Properties */

ve.ce.MWLanguageVariantNode.static.iconWhenInvisible = 'language';

ve.ce.MWLanguageVariantNode.static.maxPreviewLength = 20;

/* Static Methods */

/**
 * @inheritdoc
 */
ve.ce.MWLanguageVariantNode.static.getDescription = function ( model ) {
	// This is shown when you hover over the node.
	var variantInfo = model.getVariantInfo(),
		messageKey = 'visualeditor-mwlanguagevariant-' + model.getRuleType(),
		languageCodes = [],
		languageString;
	if ( variantInfo.name ) {
		languageCodes = [ variantInfo.name.t ];
	} else if ( variantInfo.filter ) {
		languageCodes = variantInfo.filter.l;
	} else if ( variantInfo.twoway ) {
		languageCodes = variantInfo.twoway.map( function ( item ) {
			return item.l;
		} );
	} else if ( variantInfo.oneway ) {
		languageCodes = variantInfo.oneway.map( function ( item ) {
			return item.l;
		} );
	}
	languageString = languageCodes.map( function ( code ) {
		return ve.init.platform.getLanguageName( code.toLowerCase() );
	} ).join( ve.msg( 'comma-separator' ) );
	return ve.msg( messageKey, languageString );
};

/**
 * Create a preview-safe version of some text
 *
 * The text preview is a trimmed down version of the actual rule. This
 * means that we strip whitespace and newlines, and truncate to a
 * fairly short length. The goal is to provide a fair representation of
 * typical short rules, and enough context for long rules that the
 * user can tell whether they want to see the full view by focusing the
 * node / hovering.
 *
 * @param  {string} text
 * @return {string|OO.ui.HtmlSnippet}
 */
ve.ce.MWLanguageVariantNode.static.getTextPreview = function ( text ) {
	text = text.trim().replace( /\s+/, ' ' );
	if ( text.length > this.maxPreviewLength ) {
		text = new OO.ui.HtmlSnippet( ve.escapeHtml( ve.graphemeSafeSubstring( text, 0, this.maxPreviewLength ) ) + '&hellip;' );
	}
	return text;
};

/* Methods */

/**
 * Handle model update events.
 *
 * @method
 */
ve.ce.MWLanguageVariantNode.prototype.onUpdate = function () {
	var variantInfo = this.model.getVariantInfo(),
		$element,
		html;
	if ( this.model.isHidden() ) {
		$element = $( '<div>' );
		this.model.constructor.static.insertPreviewElements(
			// For compactness, just annotate hidden rule w/ its
			// current variant output.
			$element[ 0 ], variantInfo
		);
		// Create plain-text summary of this rule (ellipsize if necessary)
		html = this.constructor.static.getTextPreview( $element.text() );
		if ( this.icon ) {
			this.icon.setLabel( html );
		}
	} else {
		this.model.constructor.static.insertPreviewElements(
			this.$holder[ 0 ], variantInfo
		);
		if ( this.icon ) {
			this.icon.setLabel( null );
		}
	}
};

/**
 * Create a {jQuery} appropriate for holding the output of this
 * conversion rule.
 * @method
 * @return {jQuery}
 */
ve.ce.MWLanguageVariantNode.prototype.appendHolder = function () {
	var tagName = this.constructor.static.tagName,
		document = this.$element[ 0 ].ownerDocument,
		$holder = $( document.createElement( tagName ) );
	$holder.addClass( 've-ce-mwLanguageVariantNode-holder' );
	this.$element.append( $holder );
	return $holder;
};

/**
 * @inheritdoc
 */
ve.ce.MWLanguageVariantNode.prototype.createInvisibleIcon = function () {
	// Unlike ancestor method, this adds a label to the (unframed) icon.
	var icon = new OO.ui.ButtonWidget( {
		classes: [ 've-ce-focusableNode-invisibleIcon' ],
		framed: false,
		icon: this.constructor.static.iconWhenInvisible
	} );
	this.icon = icon;
	this.onUpdate(); // update label of icon
	return icon.$element;
};

/**
 * @inheritdoc
 */
ve.ce.MWLanguageVariantNode.prototype.hasRendering = function () {
	// Efficiency improvement: the superclass implementation does a bunch
	// of DOM measurement to determine if the node is empty.
	// Instead consult the model for a definitive answer.
	return !this.model.isHidden();
};

/**
 * ContentEditable MediaWiki language variant block node.
 *
 * @class
 * @extends ve.ce.MWLanguageVariantNode
 *
 * @constructor
 * @param {ve.dm.MWLanguageVariantBlockNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWLanguageVariantBlockNode = function VeCeMWLanguageVariantBlockNode() {
	// Parent constructor
	ve.ce.MWLanguageVariantBlockNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWLanguageVariantBlockNode, ve.ce.MWLanguageVariantNode );

ve.ce.MWLanguageVariantBlockNode.static.name = 'mwLanguageVariantBlock';

ve.ce.MWLanguageVariantBlockNode.static.tagName = 'div';

/**
 * ContentEditable MediaWiki language variant inline node.
 *
 * @class
 * @extends ve.ce.LeafNode
 * @mixins ve.ce.MWLanguageVariantNode
 *
 * @constructor
 * @param {ve.dm.MWLanguageVariantInlineNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWLanguageVariantInlineNode = function VeCeMWLanguageVariantInlineNode() {
	// Parent constructor
	ve.ce.MWLanguageVariantInlineNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWLanguageVariantInlineNode, ve.ce.MWLanguageVariantNode );

ve.ce.MWLanguageVariantInlineNode.static.name = 'mwLanguageVariantInline';

ve.ce.MWLanguageVariantInlineNode.static.tagName = 'span';

/**
 * ContentEditable MediaWiki language variant hidden node.
 *
 * @class
 * @extends ve.ce.MWLanguageVariantNode
 *
 * @constructor
 * @param {ve.dm.MWLanguageVariantHiddenNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWLanguageVariantHiddenNode = function VeCeMWLanguageVariantHiddenNode() {
	// Parent constructor
	ve.ce.MWLanguageVariantHiddenNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWLanguageVariantHiddenNode, ve.ce.MWLanguageVariantNode );

ve.ce.MWLanguageVariantHiddenNode.static.name = 'mwLanguageVariantHidden';

ve.ce.MWLanguageVariantHiddenNode.static.tagName = 'span';

ve.ce.MWLanguageVariantHiddenNode.prototype.appendHolder = function () {
	// No holder for a hidden node.
	return null;
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWLanguageVariantBlockNode );
ve.ce.nodeFactory.register( ve.ce.MWLanguageVariantInlineNode );
ve.ce.nodeFactory.register( ve.ce.MWLanguageVariantHiddenNode );
