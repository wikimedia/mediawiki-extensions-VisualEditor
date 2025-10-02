mw.editcheck.TextMatchEditCheck = function MWTextMatchEditCheck() {
	// Parent constructor
	mw.editcheck.TextMatchEditCheck.super.apply( this, arguments );

	const rawMatchItems = [
		...this.constructor.static.matchItems,
		...( this.config.matchItems || [] )
	];
	// Normalize queries to allow support for both objects and arrays
	this.matchItems = rawMatchItems.map( ( matchItem ) => {
		let normalizedQuery = matchItem.query;

		if ( Array.isArray( matchItem.query ) ) {
			normalizedQuery = matchItem.query.reduce( ( acc, word ) => {
				acc[ word ] = null;
				return acc;
			}, Object.create( null ) );
		}
		return Object.assign( Object.create( null ), matchItem, {
			query: normalizedQuery
		} );
	} );

	this.matchItemsByTerm = {};
	this.matchItemsByTitle = {};
	this.matchItems.forEach( ( matchItem ) => {
		Object.keys( matchItem.query ).forEach( ( word ) => {
			word = word.toLowerCase();
			if ( !this.matchItemsByTerm[ word ] ) {
				this.matchItemsByTerm[ word ] = [];
			}
			this.matchItemsByTerm[ word ].push( matchItem );
		} );
		this.matchItemsByTitle[ matchItem.title ] = matchItem;
	} );

};

OO.inheritClass( mw.editcheck.TextMatchEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.TextMatchEditCheck.static.name = 'textMatch';

/**
 * The configs of TextMatchEditCheck take priority over individual matchItem configs.
 * So we make TextMatch’s defaults nonrestrictive,
 * and let the finer limitations be handled by individual matchItems.
 */
mw.editcheck.TextMatchEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	maximumEditcount: null
} );

mw.editcheck.TextMatchEditCheck.static.choices = [
	{
		action: 'dismiss',
		label: ve.msg( 'ooui-dialog-process-dismiss' ),
		modes: [ '', 'info', 'replace', 'delete' ]
	},
	{
		action: 'accept',
		label: ve.msg( 'ooui-dialog-message-accept' ),
		modes: [ 'replace' ]
	},
	{
		action: 'delete',
		label: ve.msg( 'visualeditor-contextitemwidget-label-remove' ),
		modes: [ 'delete' ]
	}
];

mw.editcheck.TextMatchEditCheck.static.matchItems = [];

mw.editcheck.TextMatchEditCheck.prototype.handleListener = function ( surfaceModel, listener ) {
	const actions = [];
	const modified = this.getModifiedContentRanges( surfaceModel.getDocument() );

	const matchedRanges = [];
	// TODO update to directly pass the set to findText
	Object.keys( this.matchItemsByTerm ).forEach( ( term ) => {
		surfaceModel.getDocument().findText( term )
			.filter( ( range ) => modified.some( ( modRange ) => range.touchesRange( modRange ) ) )
			.filter( ( range ) => this.isRangeInValidSection( range, surfaceModel.documentModel ) )
			.forEach( ( range ) => {
				matchedRanges.push( range );
			} );
	} );

	for ( const range of matchedRanges ) {
		const term = surfaceModel.getLinearFragment( range ).getText();
		// TODO: make i18n-safe
		const relevantMatchItems = this.matchItemsByTerm[ term.toLowerCase() ];
		if ( !relevantMatchItems ) {
			continue;
		}
		for ( const matchItem of relevantMatchItems ) {
			const name = this.getTagNameByMatchItem( matchItem, term );
			if ( this.isDismissedRange( range, name ) ) {
				continue;
			}
			if ( matchItem.listener && matchItem.listener !== listener ) {
				continue;
			}
			if ( matchItem.config && !this.constructor.static.doesConfigMatch( matchItem.config ) ) {
				continue;
			}
			let fragment = surfaceModel.getLinearFragment( range );
			switch ( matchItem.expand ) {
				case 'sentence':
					// TODO: implement once unicodejs support is added
					break;
				case 'paragraph':
					fragment = fragment.expandLinearSelection( 'closest', ve.dm.ContentBranchNode )
						// …but that covered the entire CBN, we only want the contents
						.adjustLinearSelection( 1, -1 );
					break;
				case 'word':
				case 'siblings':
				case 'parent':
					fragment = fragment.expandLinearSelection( matchItem.expand );
					break;
			}
			const isValidMode = this.constructor.static.choices.some( ( choice ) => choice.modes.includes( matchItem.mode ) );
			const mode = isValidMode ? matchItem.mode : '';
			actions.push(
				new mw.editcheck.TextMatchEditCheckAction( {
					fragments: [ fragment ],
					title: matchItem.title,
					message: matchItem.message,
					check: this,
					mode: mode,
					matchItem: matchItem
				} )
			);
		}
	}
	return actions;
};

mw.editcheck.TextMatchEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.handleListener( surfaceModel, 'onDocumentChange' );
};

mw.editcheck.TextMatchEditCheck.prototype.getReplacement = function ( oldWord, matchItem ) {
	const query = matchItem.query;
	let newWord = query[ oldWord ];
	if ( newWord === undefined ) {
		/* We didn't find a replacement listed under the lower-case version.
		   Do a slow scan instead. */
		// TODO: make i18n-safe
		const key = Object.keys( query ).find( ( k ) => k.toLowerCase() === oldWord.toLowerCase() );
		newWord = query[ key ];
	}
	return newWord;
};

mw.editcheck.TextMatchEditCheck.prototype.getTagNameByMatchItem = function ( matchItem, term ) {
	const matchIndex = this.matchItems.indexOf( matchItem );
	const termIndex = Object.keys( matchItem.query ).indexOf( term.toLowerCase() );

	return this.constructor.static.name + `-${ matchIndex }-${ termIndex }`;
};

// For now it doesn't make sense to run a TextMatchEditCheck in review mode
// as there isn't a way to edit the text.
mw.editcheck.TextMatchEditCheck.prototype.onBeforeSave = null;

mw.editcheck.TextMatchEditCheck.prototype.act = function ( choice, action /* , surface */ ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'delete':
			action.fragments[ 0 ].removeContent();
			break;
		case 'accept': {
			const fragment = action.fragments[ 0 ];
			const oldWord = fragment.getText();
			const matchItem = this.matchItemsByTitle[ action.title ];
			if ( !matchItem ) {
				ve.log( `mw.editcheck.TextMatchEditCheck.prototype.act(): did not find matchItem for ${ oldWord }` );
				return;
			}
			const newWord = this.getReplacement( oldWord, matchItem );
			if ( !newWord ) {
				ve.log( `mw.editcheck.TextMatchEditCheck.prototype.act(): did not find replacement for ${ oldWord }` );
				return;
			}
			fragment.removeContent().insertContent( newWord );
		}

	}
	return ve.createDeferred().resolve( {} );
};

mw.editcheck.editCheckFactory.register( mw.editcheck.TextMatchEditCheck );

/**
 * TextMatchEditCheckAction
 *
 * Subclass of EditCheckAction to include information
 * about the matchItem associated with this action
 *
 * @class
 *
 * @param {Object} config Configuration options
 * @param {Object} config.matchItem the associated matchItem for this action
 */
mw.editcheck.TextMatchEditCheckAction = function MWTextMatchEditCheckAction( config ) {
	mw.editcheck.TextMatchEditCheckAction.super.call( this, config );
	this.matchItem = config.matchItem;
};

/* Inheritance */

OO.inheritClass( mw.editcheck.TextMatchEditCheckAction, mw.editcheck.EditCheckAction );

/* Events */

/**
 * Fired when the user selects an action (e.g., clicks a suggestion button).
 *
 * @event mw.editcheck.EditCheckAction#act
 * @param {jQuery.Promise} promise A promise that resolves when the action is complete
 */

/* Methods */

/**
 * Compare to another action
 *
 * @param {mw.editcheck.EditCheckAction} other Other action
 * @return {boolean}
 */
mw.editcheck.TextMatchEditCheckAction.prototype.equals = function ( other ) {
	if ( !( other instanceof mw.editcheck.TextMatchEditCheckAction ) ||
		this.check.constructor !== other.check.constructor ) {
		return false;
	}
	if ( this.matchItem !== other.matchItem ) {
		return false;
	}
	if ( this.fragments.length !== other.fragments.length ) {
		return false;
	}
	return this.fragments.every( ( fragment ) => {
		const selection = fragment.getSelection();
		return other.fragments.some( ( otherFragment ) => otherFragment.getSelection().equals( selection ) );
	} );
};

/**
 * Get unique tag name for this action
 *
 * @return {string}
 */
mw.editcheck.TextMatchEditCheckAction.prototype.getTagName = function () {
	if ( !this.matchItem ) {
		return this.check.getName();
	}
	const matchIndex = this.check.matchItems.indexOf( this.matchItem );
	const terms = Object.keys( this.matchItem.query );
	// TODO: make i18n-safe
	const termIndex = terms.indexOf( this.originalText[ 0 ].toLowerCase() );
	if ( matchIndex === -1 || termIndex === -1 ) {
		return this.check.getName();
	}
	return this.check.getName() + `-${ matchIndex }-${ termIndex }`;
};
