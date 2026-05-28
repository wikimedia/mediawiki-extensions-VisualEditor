import fetch from 'node-fetch';
import { getDiff } from 'json-difference';

export async function fetchRevisionContent( serverUrl, revId, fetchFn = fetch ) {
	const res = await fetchFn(
		`${ serverUrl }/w/api.php?action=query&prop=revisions&revids=${ revId }&rvprop=content&rvslots=main&format=json`,
		{
			headers: {
				'User-Agent': 'EditCheckAlerts/1.0 (https://phabricator.wikimedia.org/T422693)'
			}
		}
	);
	const json = await res.json();
	const pages = json.query && json.query.pages;
	if ( !pages ) {
		return null;
	}
	const page = Object.values( pages )[ 0 ];
	const content = page.revisions && page.revisions[ 0 ].slots.main[ '*' ];
	if ( !content ) {
		return null;
	}
	return JSON.parse( content );
}

export function collapseToMinimalPaths( rawPaths ) {
	const normalize = ( p ) => p
		.replace( /\[\]/g, '' )
		.split( '/' )
		// Ignore array indices
		.filter( ( seg ) => seg !== '' && !/^\d+$/.test( seg ) )
		.join( '/' );
	const paths = [ ...new Set( rawPaths.map( normalize ) ) ];
	// Shorter paths first so we keep the shallowest unique prefixes
	paths.sort( ( a, b ) => a.split( '/' ).length - b.split( '/' ).length || a.localeCompare( b ) );
	const result = [];
	for ( const path of paths ) {
		if ( !result.some( ( kept ) => path === kept || path.startsWith( kept + '/' ) ) ) {
			result.push( path );
		}
	}
	return result;
}

function pathExistsIn( obj, path ) {
	const segments = path.split( '/' ).filter( Boolean );
	let current = obj;
	for ( const seg of segments ) {
		if ( current === null || typeof current !== 'object' || !( seg in current ) ) {
			return false;
		}
		current = current[ seg ];
	}
	return true;
}

export function formatJsonDiff( oldJson, newJson ) {
	const diff = getDiff( oldJson, newJson );

	let added = collapseToMinimalPaths( diff.added.map( ( [ k ] ) => k ) );
	let removed = collapseToMinimalPaths( diff.removed.map( ( [ k ] ) => k ) );
	let edited = collapseToMinimalPaths( diff.edited.map( ( [ k ] ) => k ) );

	const addedSet = new Set( added );
	const removedSet = new Set( removed );
	const editedSet = new Set( edited );

	// If a normalized "added" path already existed in oldJson, the key wasn't truly
	// added — it was modified (e.g. new elements appended to an existing array whose
	// existing elements were unchanged, so no "edited" entries appeared in the raw diff).
	for ( const path of addedSet ) {
		if ( pathExistsIn( oldJson, path ) ) {
			addedSet.delete( path );
			editedSet.add( path );
		}
	}
	// Symmetrically: if a normalized "removed" path still exists in newJson, the key
	// wasn't truly removed — elements were removed from it (e.g. array items dropped).
	for ( const path of removedSet ) {
		if ( pathExistsIn( newJson, path ) ) {
			removedSet.delete( path );
			editedSet.add( path );
		}
	}

	// A path that appears in both added and removed is really an edit.
	// A path that appears in added or removed but also in edited should stay only in edited
	// (e.g. new numeric indices added to an existing array normalize to the parent key,
	// which may also appear in edited from changed existing indices).
	for ( const path of addedSet ) {
		if ( removedSet.has( path ) || editedSet.has( path ) ) {
			addedSet.delete( path );
			removedSet.delete( path );
			editedSet.add( path );
		}
	}
	for ( const path of removedSet ) {
		if ( editedSet.has( path ) ) {
			removedSet.delete( path );
		}
	}
	added = [ ...addedSet ];
	removed = [ ...removedSet ];
	edited = [ ...editedSet ];

	const lines = [];
	if ( added.length ) {
		lines.push( `  - *Added:* ${ added.map( ( k ) => `\`${ k }\`` ).join( ', ' ) }` );
	}
	if ( removed.length ) {
		lines.push( `  - *Removed:* ${ removed.map( ( k ) => `\`${ k }\`` ).join( ', ' ) }` );
	}
	if ( edited.length ) {
		lines.push( `  - *Edited:* ${ edited.map( ( k ) => `\`${ k }\`` ).join( ', ' ) }` );
	}

	return lines.length ? '\n' + lines.join( '\n' ) : '';
}
