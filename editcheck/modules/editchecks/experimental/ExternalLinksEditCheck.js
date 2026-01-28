mw.editcheck.ExternalLinksEditCheck = function MWExternalLinksEditCheck() {
	// Parent constructor
	mw.editcheck.ExternalLinksEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ExternalLinksEditCheck, mw.editcheck.LinkEditCheck );

mw.editcheck.ExternalLinksEditCheck.static.title = 'External link';

mw.editcheck.ExternalLinksEditCheck.static.name = 'externalLink';

mw.editcheck.ExternalLinksEditCheck.static.description = 'Generally, external links should not appear in the body of the article. Please refer to WP:ELNO. Edit this link?';

mw.editcheck.ExternalLinksEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.LinkEditCheck.static.defaultConfig, {
	ignoreSections: [
		'External links',
		'References',
		'Further reading'
	]
} );

mw.editcheck.ExternalLinksEditCheck.static.choices = [
	{
		action: 'remove',
		label: 'Remove link',
		icon: 'trash'
	},
	{
		action: 'dismiss',
		label: 'Dismiss' // TODO: i18n
	}
];

mw.editcheck.ExternalLinksEditCheck.static.linkClasses = [ ve.dm.MWExternalLinkAnnotation ];

let interwikiUrlPatternsPromise = null;

/**
 * Get a promise for interwiki URL patterns.
 *
 * TODO: De-duplicate with similar code in mw.TitleWidget.
 *
 * @return {Promise<RegExp[]>} Promise resolving to array of regexes for interwiki URL patterns
 */
mw.editcheck.ExternalLinksEditCheck.prototype.getInterwikiUrlPatternsPromise = function () {
	const api = this.controller.target.getContentApi();

	if ( !interwikiUrlPatternsPromise ) {
		// Cache client-side for a day since this info is mostly static
		const oneDay = 60 * 60 * 24;
		interwikiUrlPatternsPromise = api.get( {
			action: 'query',
			meta: 'siteinfo',
			siprop: 'interwikimap',
			maxage: oneDay,
			smaxage: oneDay,
			// Workaround T97096 by setting uselang=content
			uselang: 'content'
		} ).then( ( data ) => data.query.interwikimap.map(
			( iw ) => mw.libs.ve.getRegexFromUrlPattern( iw.url ) )
		);
		// Do not cache errors
		interwikiUrlPatternsPromise.catch( () => {
			interwikiUrlPatternsPromise = null;
		} );
	}
	return interwikiUrlPatternsPromise;
};

mw.editcheck.ExternalLinksEditCheck.prototype.onDocumentChange = function ( surfaceModel ) {
	return this.getModifiedLinkRanges( surfaceModel ).map(
		( annRange ) => this.getInterwikiUrlPatternsPromise().then( ( interwikiUrlPatterns ) => {
			const href = annRange.annotation.getAttribute( 'href' );
			if ( interwikiUrlPatterns.some( ( regex ) => regex.test( href ) ) ) {
				// Ignore interwiki links
				return null;
			}
			return this.buildActionFromLinkRange( annRange.range, surfaceModel );
		} )
	);
};

mw.editcheck.ExternalLinksEditCheck.prototype.act = function ( choice, action ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'remove':
			action.fragments[ 0 ].annotateContent( 'clear', ve.ce.MWExternalLinkAnnotation.static.name );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ExternalLinksEditCheck );
