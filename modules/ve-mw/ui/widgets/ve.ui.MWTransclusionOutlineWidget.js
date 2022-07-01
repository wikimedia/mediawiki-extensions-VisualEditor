/*!
 * VisualEditor user interface MWTransclusionOutlineWidget class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Container for transclusion, may contain a single or multiple templates.
 *
 * @class
 * @extends OO.ui.Widget
 *
 * @constructor
 * @property {Object.<string,ve.ui.MWTransclusionOutlinePartWidget>} partWidgets Map of top-level
 *  items currently visible in this container, indexed by part id
 */
ve.ui.MWTransclusionOutlineWidget = function VeUiMWTransclusionOutlineWidget() {
	// Parent constructor
	ve.ui.MWTransclusionOutlineWidget.super.call( this, {
		classes: [ 've-ui-mwTransclusionOutlineWidget' ]
	} );

	// Initialization
	this.partWidgets = {};
};

/* Inheritance */

OO.inheritClass( ve.ui.MWTransclusionOutlineWidget, OO.ui.Widget );

/* Events */

/**
 * @event filterPagesByName
 * @param {Object.<string,boolean>} visibility Keyed by unique id of the {@see OO.ui.BookletLayout}
 *  page, e.g. something like "part_1/param1".
 */

/**
 * @event focusPageByName
 * @param {string} pageName Unique id of the {@see OO.ui.BookletLayout} page, e.g. something like
 *  "part_1" or "part_1/param1".
 */

/**
 * @param {ve.dm.MWTransclusionPartModel|null} removed Removed part
 * @param {ve.dm.MWTransclusionPartModel|null} added Added part
 * @param {number} [newPosition]
 */
ve.ui.MWTransclusionOutlineWidget.prototype.onReplacePart = function ( removed, added, newPosition ) {
	if ( removed ) {
		this.removePartWidget( removed );
	}
	if ( added ) {
		this.addPartWidget( added, newPosition, removed );
	}
};

/* Methods */

/**
 * @private
 * @param {ve.dm.MWTransclusionPartModel} part
 */
ve.ui.MWTransclusionOutlineWidget.prototype.removePartWidget = function ( part ) {
	var id = part.getId();
	if ( id in this.partWidgets ) {
		this.partWidgets[ id ]
			.disconnect( this )
			.$element.remove();
		delete this.partWidgets[ id ];
	}
};

/**
 * @private
 * @param {ve.dm.MWTransclusionPartModel} part
 * @param {number} [newPosition]
 * @param {ve.dm.MWTransclusionPartModel|null} [removed]
 * @fires filterPagesByName
 */
ve.ui.MWTransclusionOutlineWidget.prototype.addPartWidget = function ( part, newPosition, removed ) {
	var widget;

	if ( part instanceof ve.dm.MWTemplateModel ) {
		widget = new ve.ui.MWTransclusionOutlineTemplateWidget( part, removed instanceof ve.dm.MWTemplatePlaceholderModel );
		// This forwards events from the nested ve.ui.MWTransclusionOutlineTemplateWidget upwards.
		// The array syntax is a way to call `this.emit( 'filterParameters' )`.
		widget.connect( this, {
			// We can forward these events as is. The parameter's unique ids are reused as page
			// names in {@see ve.ui.MWTemplateDialog.onAddParameter}.
			focusTemplateParameterById: [ 'emit', 'focusPageByName' ],
			filterParametersById: [ 'emit', 'filterPagesByName' ]
		} );
	} else if ( part instanceof ve.dm.MWTemplatePlaceholderModel ) {
		widget = new ve.ui.MWTransclusionOutlinePlaceholderWidget( part );
	} else if ( part instanceof ve.dm.MWTransclusionContentModel ) {
		widget = new ve.ui.MWTransclusionOutlineWikitextWidget( part );
	}

	widget.connect( this, {
		transclusionPartSoftSelected: 'setSelectionByPageName',
		transclusionPartSelected: [ 'emit', 'focusPageByName' ]
	} );

	this.partWidgets[ part.getId() ] = widget;
	if ( typeof newPosition === 'number' && newPosition < this.$element.children().length ) {
		this.$element.children().eq( newPosition ).before( widget.$element );
	} else {
		this.$element.append( widget.$element );
	}
};

ve.ui.MWTransclusionOutlineWidget.prototype.hideAllUnusedParameters = function () {
	for ( var id in this.partWidgets ) {
		var partWidget = this.partWidgets[ id ];
		if ( partWidget instanceof ve.ui.MWTransclusionOutlineTemplateWidget &&
			partWidget.toggleUnusedWidget
		) {
			partWidget.toggleUnusedWidget.toggleUnusedParameters( false );
		}
	}
};

/**
 * This is inspired by {@see OO.ui.SelectWidget.selectItem}, but isn't one.
 *
 * @param {string} pageName
 * @fires selectedTransclusionPartChanged
 */
ve.ui.MWTransclusionOutlineWidget.prototype.setSelectionByPageName = function ( pageName ) {
	var selectedPartId = pageName.split( '/', 1 )[ 0 ],
		isParameter = pageName.length > selectedPartId.length;

	for ( var partId in this.partWidgets ) {
		var partWidget = this.partWidgets[ partId ],
			selected = partId === pageName;

		if ( partWidget.isSelected() !== selected ) {
			partWidget.setSelected( selected );
			if ( selected && !isParameter ) {
				partWidget.scrollElementIntoView();
			}
		}

		if ( partWidget instanceof ve.ui.MWTransclusionOutlineTemplateWidget ) {
			var selectedParamName = ( partId === selectedPartId && isParameter ) ?
				pageName.slice( selectedPartId.length + 1 ) : null;
			partWidget.highlightParameter( selectedParamName );
		}
	}
};

/**
 * @param {string} pageName
 * @param {boolean} hasValue
 */
ve.ui.MWTransclusionOutlineWidget.prototype.toggleHasValueByPageName = function ( pageName, hasValue ) {
	var idParts = pageName.split( '/' ),
		templatePartWidget = this.partWidgets[ idParts[ 0 ] ];

	templatePartWidget.toggleHasValue( idParts[ 1 ], hasValue );
};

/**
 * This is inspired by {@see OO.ui.SelectWidget.findSelectedItem}, but isn't one.
 *
 * @return {string|undefined} Always a top-level part id, e.g. "part_0"
 */
ve.ui.MWTransclusionOutlineWidget.prototype.findSelectedPartId = function () {
	for ( var id in this.partWidgets ) {
		var part = this.partWidgets[ id ];
		if ( part.isSelected() ) {
			return part.getData();
		}
	}
};

/**
 * Removes all {@see ve.ui.MWTransclusionOutlinePartWidget}, i.e. empties the list.
 */
ve.ui.MWTransclusionOutlineWidget.prototype.clear = function () {
	for ( var id in this.partWidgets ) {
		this.partWidgets[ id ]
			.disconnect( this )
			.$element.remove();
	}
	this.partWidgets = {};
};
