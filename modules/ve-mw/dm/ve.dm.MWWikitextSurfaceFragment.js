/*!
 * VisualEditor DataModel MWWikitextSurfaceFragment class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * DataModel MWWikitextSurfaceFragment.
 *
 * @class
 * @extends ve.dm.SourceSurfaceFragment
 *
 * @constructor
 * @param {ve.dm.Document} doc
 */
ve.dm.MWWikitextSurfaceFragment = function VeDmMwWikitextSurfaceFragment() {
	// Parent constructors
	ve.dm.MWWikitextSurfaceFragment.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWWikitextSurfaceFragment, ve.dm.SourceSurfaceFragment );

/* Methods */

/**
 * @inheritdoc
 */
ve.dm.MWWikitextSurfaceFragment.prototype.hasMatchingAncestor = function ( type, attributes ) {
	const nodes = this.getSelectedLeafNodes();

	let all = !!nodes.length;
	for ( let i = 0, len = nodes.length; i < len; i++ ) {
		const text = this.document.data.getText( false, nodes[ i ].getRange() );
		// TODO: Use a registry to do this matching
		switch ( type ) {
			case 'paragraph':
				// Anything but what's matched below
				all = !/^([ =]|<blockquote>)/.test( text );
				break;
			case 'mwPreformatted':
				all = text.startsWith( ' ' );
				break;
			case 'blockquote':
				all = text.startsWith( '<blockquote>' );
				break;
			case 'mwHeading':
				all = new RegExp( '^={' + attributes.level + '}[^=]' ).test( text ) &&
					new RegExp( '[^=]={' + attributes.level + '}$' ).test( text );
				break;
			default:
				all = false;
				break;
		}
		if ( !all ) {
			break;
		}
	}

	return all;
};

/**
 * Wrap a text selection.
 *
 * If the selection is already identically wrapped it will be unwrapped.
 *
 * @param {string} before Text to go before selection
 * @param {string} after Text to go after selection
 * @param {Function|string} placeholder Placeholder text to insert at an empty selection
 * @param {boolean} [forceWrap=false] Force wrapping, even if matching wrapping exists
 * @return {ve.dm.MWWikitextSurfaceFragment}
 * @chainable
 */
ve.dm.MWWikitextSurfaceFragment.prototype.wrapText = function ( before, after, placeholder, forceWrap ) {
	placeholder = OO.ui.resolveMsg( placeholder );

	function unwrap( fragment ) {
		const text = fragment.getText();
		if (
			( !before || text.startsWith( before ) ) &&
			( !after || text.endsWith( after ) )
		) {
			fragment.unwrapText( before.length, after.length );
			// Just the placeholder left, nothing meaningful was selected so just remove it
			if ( fragment.getText() === placeholder ) {
				fragment.removeContent();
			}
			return true;
		}
		return false;
	}

	if ( !forceWrap && ( unwrap( this ) || unwrap( this.adjustLinearSelection( -before.length, after.length ) ) ) ) {
		return this;
	} else {
		if ( placeholder && this.getSelection().isCollapsed() ) {
			this.insertContent( placeholder );
		}
		const wrappedFragment = this.clone();
		const wasExcludingInsertions = this.willExcludeInsertions();
		this.setExcludeInsertions( true );
		this.collapseToStart().insertContent( before );
		this.collapseToEnd().insertContent( after );
		this.setExcludeInsertions( wasExcludingInsertions );
		return wrappedFragment;
	}
};

/**
 * Unwrap a fixed amount of text
 *
 * @param {number} before Amount of text to remove from start
 * @param {number} after Amount of text to remove from end
 * @return {ve.dm.MWWikitextSurfaceFragment}
 * @chainable
 */
ve.dm.MWWikitextSurfaceFragment.prototype.unwrapText = function ( before, after ) {
	this.collapseToStart().adjustLinearSelection( 0, before ).removeContent();
	this.collapseToEnd().adjustLinearSelection( -after, 0 ).removeContent();
	return this;
};

/**
 * @inheritdoc
 */
ve.dm.MWWikitextSurfaceFragment.prototype.convertToSource = function ( doc ) {
	if ( !doc.data.hasContent() ) {
		return ve.createDeferred().resolve( '' ).promise();
	}

	const wikitextPromise = ve.init.target.getWikitextFragment( doc, false );

	// TODO: Emit an event to trigger the progress bar
	const progressPromise = ve.init.target.getSurface().createProgress(
		wikitextPromise, ve.msg( 'visualeditor-generating-wikitext-progress' )
	).then( ( progressBar, cancelPromise ) => {
		cancelPromise.then( null, () => {
			wikitextPromise.abort();
		} );
	} );

	return ve.promiseAll( [ wikitextPromise, progressPromise ] ).then( ( wikitext ) => {
		const deferred = ve.createDeferred();
		setTimeout( () => {
			if ( wikitext !== undefined ) {
				deferred.resolve( wikitext );
			} else {
				deferred.reject();
			}
		}, ve.init.target.getSurface().dialogs.getTeardownDelay() );
		return deferred.promise();
	} );
};

/**
 * @inheritdoc
 */
ve.dm.MWWikitextSurfaceFragment.prototype.convertFromSource = function ( source ) {
	let parsePromise;
	if ( !source ) {
		parsePromise = ve.createDeferred().resolve(
			ve.dm.Document.static.newBlankDocument()
		).promise();
	} else {
		parsePromise = ve.init.target.parseWikitextFragment( source, false, this.getDocument() ).then( ( response ) => ve.dm.converter.getModelFromDom(
			ve.createDocumentFromHtml( response.visualeditor.content )
		) );
	}

	// TODO: Show progress bar without breaking WindowAction
	/*
	ve.init.target.getSurface().createProgress(
		parsePromise, ve.msg( 'visualeditor-generating-wikitext-progress' )
	).done( ( progressBar, cancelPromise ) => {
		cancelPromise.fail( () => {
			parsePromise.abort();
		} );
	} );
	*/

	return parsePromise;
};
