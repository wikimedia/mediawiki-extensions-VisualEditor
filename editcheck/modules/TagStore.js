/**
 * Store of tags that edit checks put on actions, fragments and IDs, e.g. 'dismissed'
 *
 * Tags are kept for each tag namespace (usually a check name). A controller owns one
 * store for the editing session, and gives it to each check it creates. A check made
 * without a store gets an empty one, so nothing is tagged for it.
 *
 * @class
 * @constructor
 */
mw.editcheck.TagStore = function MWTagStore() {
	this.clear();
};

/* Inheritance */

OO.initClass( mw.editcheck.TagStore );

/* Methods */

/**
 * Remove all tags
 */
mw.editcheck.TagStore.prototype.clear = function () {
	// Tagged fragments, keyed by namespace then tag
	this.fragments = {};
	// Tagged action IDs, keyed by namespace then tag
	this.ids = {};
	// Tagged fragments to clear once the selection leaves their range
	this.ephemeral = [];
};

/**
 * Tag an ID
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {string} id
 */
mw.editcheck.TagStore.prototype.tagId = function ( name, tag, id ) {
	this.ids[ name ] = this.ids[ name ] || {};
	this.ids[ name ][ tag ] = this.ids[ name ][ tag ] || new Set();
	this.ids[ name ][ tag ].add( id );
};

/**
 * Remove a tag from an ID
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {string} id
 * @return {boolean} The tag namespace had this tag
 */
mw.editcheck.TagStore.prototype.untagId = function ( name, tag, id ) {
	if ( this.ids[ name ] && this.ids[ name ][ tag ] ) {
		this.ids[ name ][ tag ].delete( id );
		return true;
	}
	return false;
};

/**
 * Check if an ID has a tag
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {string} id
 * @return {boolean}
 */
mw.editcheck.TagStore.prototype.isTaggedId = function ( name, tag, id ) {
	const ids = this.ids[ name ] && this.ids[ name ][ tag ];
	return !!ids && ids.has( id );
};

/**
 * Tag a set of fragments
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {ve.dm.SurfaceFragment[]} fragments
 * @param {boolean} [ephemeral] Clear the tag once the selection leaves the tagged range
 * @param {boolean} [includeInsertions=false] Grow the tagged range when content is inserted at its edges
 */
mw.editcheck.TagStore.prototype.tagFragments = function ( name, tag, fragments, ephemeral, includeInsertions ) {
	this.fragments[ name ] = this.fragments[ name ] || {};
	this.fragments[ name ][ tag ] = this.fragments[ name ][ tag ] || [];
	fragments.forEach( ( fragment ) => {
		// By default, exclude insertions so we don't accidentally block unrelated changes:
		const clone = fragment.clone().setExcludeInsertions( !includeInsertions );
		this.fragments[ name ][ tag ].push( clone );
		if ( ephemeral ) {
			this.ephemeral.push( { name, tag, fragment: clone } );
		}
	} );
};

/**
 * Remove a tag from the tagged fragments that cover any of a set of fragments
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {ve.dm.SurfaceFragment[]} fragments
 */
mw.editcheck.TagStore.prototype.untagCoveringFragments = function ( name, tag, fragments ) {
	const tags = this.fragments[ name ];
	if ( !tags || !tags[ tag ] ) {
		return;
	}
	const ranges = fragments.map( ( fragment ) => fragment.getSelection().getCoveringRange() );
	tags[ tag ] = tags[ tag ].filter( ( taggedFragment ) => {
		const taggedRange = taggedFragment.getSelection().getCoveringRange();
		if ( taggedRange && ranges.some( ( range ) => range && taggedRange.containsRange( range ) ) ) {
			this.ephemeral = this.ephemeral.filter( ( entry ) => entry.fragment !== taggedFragment );
			return false;
		}
		return true;
	} );
};

/**
 * Remove a tag from the tagged fragments with the same selection as a set of fragments
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {ve.dm.SurfaceFragment[]} fragments
 */
mw.editcheck.TagStore.prototype.untagExactFragments = function ( name, tag, fragments ) {
	const tagged = this.fragments[ name ] && this.fragments[ name ][ tag ];
	if ( !tagged ) {
		return;
	}
	fragments.forEach( ( fragment ) => {
		const selection = fragment.getSelection();
		const index = tagged.findIndex(
			( taggedFragment ) => taggedFragment.getSelection().equals( selection )
		);
		if ( index !== -1 ) {
			tagged.splice( index, 1 );
		}
	} );
};

/**
 * Check if a tagged fragment covers a range
 *
 * @param {string} name Tag namespace
 * @param {string} tag
 * @param {ve.Range} range
 * @return {boolean}
 */
mw.editcheck.TagStore.prototype.isTaggedRange = function ( name, tag, range ) {
	const fragments = this.fragments[ name ] && this.fragments[ name ][ tag ];
	return !!fragments && fragments.some(
		( fragment ) => fragment.getSelection().getCoveringRange().containsRange( range )
	);
};

/**
 * Clear the ephemeral tags whose range does not contain a range
 *
 * @param {ve.Range|null} range Range to keep tags for, e.g. the covering range of the selection
 * @return {boolean} Some tags were cleared
 */
mw.editcheck.TagStore.prototype.clearEphemeralOutside = function ( range ) {
	let cleared = false;
	this.ephemeral = this.ephemeral.filter( ( entry ) => {
		const taggedRange = entry.fragment.getSelection().getCoveringRange();
		if ( taggedRange && range && taggedRange.containsRange( range ) ) {
			return true;
		}
		const tagged = this.fragments[ entry.name ] && this.fragments[ entry.name ][ entry.tag ];
		const index = tagged ? tagged.indexOf( entry.fragment ) : -1;
		if ( index !== -1 ) {
			tagged.splice( index, 1 );
		}
		cleared = true;
		return false;
	} );
	return cleared;
};
