mw.editcheck.ExternalLinksEditCheck = function MWExternalLinksEditCheck() {
	// Parent constructor
	mw.editcheck.ExternalLinksEditCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ExternalLinksEditCheck, mw.editcheck.BaseEditCheck );

mw.editcheck.ExternalLinksEditCheck.static.title = 'External link';

mw.editcheck.ExternalLinksEditCheck.static.name = 'externalLink';

mw.editcheck.ExternalLinksEditCheck.static.description = 'Generally, external links should not appear in the body of the article. Please refer to WP:ELNO. Edit this link?';

mw.editcheck.ExternalLinksEditCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	ignoreSections: [
		'External links',
		'References',
		'Further reading'
	]
} );

mw.editcheck.ExternalLinksEditCheck.static.choices = [
	{
		action: 'edit',
		label: 'Edit link',
		icon: 'edit'
	},
	{
		action: 'dismiss',
		label: 'Dismiss' // TODO: i18n
	}
];

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
	const modified = this.getModifiedContentRanges( surfaceModel.getDocument() );
	return surfaceModel.documentModel.documentNode.getAnnotationRanges()
		.filter( ( annRange ) => annRange.annotation instanceof ve.dm.MWExternalLinkAnnotation &&
			!this.isDismissedRange( annRange.range ) &&
			this.isRangeInValidSection( annRange.range, surfaceModel.documentModel ) &&
			modified.some( ( modifiedRange ) => modifiedRange.containsRange( annRange.range ) )
		).map( ( annRange ) => this.getInterwikiUrlPatternsPromise().then( ( interwikiUrlPatterns ) => {
			const href = annRange.annotation.getAttribute( 'href' );
			if ( interwikiUrlPatterns.some( ( regex ) => regex.test( href ) ) ) {
				// Ignore interwiki links
				return null;
			}
			return new mw.editcheck.EditCheckAction( {
				fragments: [ surfaceModel.getLinearFragment( annRange.range ) ],
				focusAnnotation: ( annView ) => annView instanceof ve.ce.MWExternalLinkAnnotation,
				check: this
			} );
		} ) );
};

mw.editcheck.ExternalLinksEditCheck.prototype.act = function ( choice, action, surface ) {
	switch ( choice ) {
		case 'dismiss':
			this.dismiss( action );
			break;
		case 'edit':
			setTimeout( () => {
				action.fragments[ 0 ].select();
				surface.execute( 'window', 'open', 'link' );
			} );
			break;
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ExternalLinksEditCheck );
