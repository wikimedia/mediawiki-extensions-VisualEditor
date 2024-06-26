/*!
 * VisualEditor UserInterface MWExtensionWindow class.
 *
 * @copyright See AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Mixin for windows for editing generic MediaWiki extensions.
 *
 * @class
 * @abstract
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.MWExtensionWindow = function VeUiMWExtensionWindow() {
	this.whitespace = null;
	this.input = null;
	this.originalMwData = null;

	this.onChangeHandler = ve.debounce( this.onChange.bind( this ) );
};

/* Inheritance */

OO.initClass( ve.ui.MWExtensionWindow );

/* Static properties */

/**
 * Extension is allowed to have empty contents
 *
 * @static
 * @property {boolean}
 * @inheritable
 */
ve.ui.MWExtensionWindow.static.allowedEmpty = false;

/**
 * Tell Parsoid to self-close tags when the body is empty
 *
 * i.e. `<foo></foo>` -> `<foo/>`
 *
 * @static
 * @property {boolean}
 * @inheritable
 */
ve.ui.MWExtensionWindow.static.selfCloseEmptyBody = false;

/**
 * Inspector's directionality, 'ltr' or 'rtl'
 *
 * Leave as null to use the directionality of the current fragment.
 *
 * @static
 * @property {string|null}
 * @inheritable
 */
ve.ui.MWExtensionWindow.static.dir = null;

/* Methods */

/**
 * @inheritdoc OO.ui.Window
 */
ve.ui.MWExtensionWindow.prototype.initialize = function () {
	this.input = new ve.ui.WhitespacePreservingTextInputWidget( {
		limit: 1,
		classes: [ 've-ui-mwExtensionWindow-input' ]
	} );
};

/**
 * Get the placeholder text for the content input area.
 *
 * @return {string} Placeholder text
 */
ve.ui.MWExtensionWindow.prototype.getInputPlaceholder = function () {
	return '';
};

/**
 * @inheritdoc OO.ui.Window
 */
ve.ui.MWExtensionWindow.prototype.getSetupProcess = function ( data, process ) {
	data = data || {};
	return process.next( () => {
		// Initialization
		this.whitespace = [ '', '' ];

		if ( this.selectedNode ) {
			const mwData = this.selectedNode.getAttribute( 'mw' );
			// mwData.body can be null in <selfclosing/> extensions
			this.input.setValueAndWhitespace( ( mwData.body && mwData.body.extsrc ) || '' );
			this.originalMwData = mwData;
		} else {
			if ( !this.constructor.static.modelClasses[ 0 ].static.isContent ) {
				// New nodes should use linebreaks for blocks
				this.input.setWhitespace( [ '\n', '\n' ] );
			}
			this.input.setValue( '' );
		}

		this.input.$input.attr( 'placeholder', this.getInputPlaceholder() );

		const dir = this.constructor.static.dir || data.dir;
		this.input.setDir( dir );
		this.input.setReadOnly( this.isReadOnly() );

		this.actions.setAbilities( { done: false } );
		this.input.connect( this, { change: 'onChangeHandler' } );
	} );
};

/**
 * @inheritdoc OO.ui.Window
 */
ve.ui.MWExtensionWindow.prototype.getReadyProcess = function ( data, process ) {
	return process;
};

/**
 * @inheritdoc OO.ui.Window
 */
ve.ui.MWExtensionWindow.prototype.getTeardownProcess = function ( data, process ) {
	return process.next( () => {
		// Don't hold on to the original data, it's only refreshed on setup for existing nodes
		this.originalMwData = null;
		this.input.disconnect( this, { change: 'onChangeHandler' } );
	} );
};

/**
 * @inheritdoc OO.ui.Dialog
 */
ve.ui.MWExtensionWindow.prototype.getActionProcess = function ( action, process ) {
	return process.first( () => {
		if ( action === 'done' ) {
			if ( this.constructor.static.allowedEmpty || this.input.getValue() !== '' ) {
				this.insertOrUpdateNode();
			} else if ( this.selectedNode && !this.constructor.static.allowedEmpty ) {
				// Content has been emptied on a node which isn't allowed to
				// be empty, so delete it.
				this.removeNode();
			}
		}
	} );
};

/**
 * Handle change event.
 */
ve.ui.MWExtensionWindow.prototype.onChange = function () {
	this.updateActions();
};

/**
 * Update the 'done' action according to whether there are changes
 */
ve.ui.MWExtensionWindow.prototype.updateActions = function () {
	this.actions.setAbilities( { done: this.isSaveable() } );
};

/**
 * Check if mwData would be modified if window contents were applied.
 * This is used to determine if it's meaningful for the user to save the
 * contents into the document; this is likely true of newly-created elements.
 *
 * @return {boolean} mwData would be modified
 */
ve.ui.MWExtensionWindow.prototype.isSaveable = function () {
	let modified;
	if ( this.originalMwData ) {
		const mwDataCopy = ve.copy( this.originalMwData );
		this.updateMwData( mwDataCopy );
		modified = !ve.compare( this.originalMwData, mwDataCopy );
	} else {
		modified = true;
	}
	return modified;
};

/**
 * @deprecated Moved to ve.ui.MWExtensionWindow.prototype.isSaveable
 * @return {boolean} mwData would be modified
 */
ve.ui.MWExtensionWindow.prototype.isModified = ve.ui.MWExtensionWindow.prototype.isSaveable;

/**
 * Check if mwData has meaningful edits. This is used to determine if it's
 * meaningful to warn the user before closing the dialog without saving. Unlike
 * `isModified()` above, we consider a newly-created but unmodified element to
 * be non-meaningful because the user can simply re-open the dialog to restore
 * their state.
 *
 * @return {boolean} mwData would contain new user input
 */
ve.ui.MWExtensionWindow.prototype.hasMeaningfulEdits = function () {
	let mwDataBaseline;
	if ( this.originalMwData ) {
		mwDataBaseline = this.originalMwData;
	} else {
		mwDataBaseline = this.getNewElement().attributes.mw;
	}
	const mwDataCopy = ve.copy( mwDataBaseline );
	this.updateMwData( mwDataCopy );

	// We have some difficulty here. `updateMwData()` in this class calls on
	// `this.input.getValueAndWhitespace()`. The 'and whitespace' means that
	// we cannot directly compare a new element's mwData with a newly-opened
	// dialog's mwData because it may have additional newlines.
	// We don't want to touch `this.input` or `prototype.updateMwData` because
	// they're overridden in subclasses. Therefore, we consider whitespace-only
	// changes to a new element to be non-meaningful too.
	const changed = OO.getProp( mwDataCopy, 'body', 'extsrc' );
	if ( changed !== undefined ) {
		OO.setProp( mwDataCopy, 'body', 'extsrc', changed.trim() );
	}

	// Also trim the baseline. In "edit" mode we likely have added whitespace,
	// and in "insert" mode we don't want to break if the default value starts
	// or ends with whitespace.
	const baselineChanged = OO.getProp( mwDataBaseline, 'body', 'extsrc' );
	if ( baselineChanged !== undefined ) {
		OO.setProp( mwDataBaseline, 'body', 'extsrc', baselineChanged.trim() );
	}

	return !ve.compare( mwDataBaseline, mwDataCopy );
};

/**
 * Create an new data element for the model class associated with this inspector
 *
 * @return {Object} Element data
 */
ve.ui.MWExtensionWindow.prototype.getNewElement = function () {
	// Extension inspectors which create elements should either match
	// a single modelClass or override this method.
	const modelClass = this.constructor.static.modelClasses[ 0 ];
	return {
		type: modelClass.static.name,
		attributes: {
			mw: {
				name: modelClass.static.extensionName,
				attrs: {},
				body: {
					extsrc: ''
				}
			}
		}
	};
};

/**
 * Insert or update the node in the document model from the new values
 */
ve.ui.MWExtensionWindow.prototype.insertOrUpdateNode = function () {
	const surfaceModel = this.getFragment().getSurface();
	if ( this.selectedNode ) {
		const mwData = ve.copy( this.selectedNode.getAttribute( 'mw' ) );
		this.updateMwData( mwData );
		surfaceModel.change(
			ve.dm.TransactionBuilder.static.newFromAttributeChanges(
				surfaceModel.getDocument(),
				this.selectedNode.getOuterRange().start,
				{ mw: mwData }
			)
		);
	} else {
		const element = this.getNewElement();
		this.updateMwData( element.attributes.mw );
		// Collapse returns a new fragment, so update this.fragment
		this.fragment = this.getFragment().collapseToEnd();
		this.getFragment().insertContent( [
			element,
			{ type: '/' + element.type }
		] );
	}
};

/**
 * Remove the node form the document model
 */
ve.ui.MWExtensionWindow.prototype.removeNode = function () {
	this.getFragment().removeContent();
};

/**
 * Update mwData object with the new values from the inspector or dialog
 *
 * @param {Object} mwData MediaWiki data object
 */
ve.ui.MWExtensionWindow.prototype.updateMwData = function ( mwData ) {
	const tagName = mwData.name;
	let value = this.input.getValueAndWhitespace();

	// XML-like tags in wikitext are not actually XML and don't expect their contents to be escaped.
	// This means that it is not possible for a tag '<foo>…</foo>' to contain the string '</foo>'.
	// Prevent that by escaping the first angle bracket '<' to '&lt;'. (T59429)
	value = value.replace( new RegExp( '<(/' + tagName + '\\s*>)', 'gi' ), '&lt;$1' );

	if ( value.trim() === '' && this.constructor.static.selfCloseEmptyBody ) {
		delete mwData.body;
	} else {
		mwData.body = mwData.body || {};
		mwData.body.extsrc = value;
	}
};
