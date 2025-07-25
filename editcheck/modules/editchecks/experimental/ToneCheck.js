mw.editcheck.ToneCheck = function MWToneCheck() {
	// Parent constructor
	mw.editcheck.ToneCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ToneCheck, mw.editcheck.AsyncTextCheck );

/* Static properties */

mw.editcheck.ToneCheck.static.name = 'tone';

mw.editcheck.ToneCheck.static.allowedContentLanguages = [ 'en', 'es', 'fr', 'ja', 'pt' ];

mw.editcheck.ToneCheck.static.defaultConfig = ve.extendObject( {}, mw.editcheck.BaseEditCheck.static.defaultConfig, {
	predictionThreshold: 0.8
} );

/* Static methods */

/**
 * Perform an asynchronous check
 *
 * @param {string} text The plaintext to check
 * @return {Promise|any}
 */
mw.editcheck.ToneCheck.static.checkAsync = function ( text ) {
	/* Don't send requests for short strings */
	if ( text.trim().length <= 0 ) {
		return false;
	}

	const title = mw.Title.newFromText( mw.config.get( 'wgRelevantPageName' ) );
	const titleText = title ? title.getMainText() : '';

	return fetch( 'https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict', {
		method: 'POST',
		headers: {
			'Content-Type': 'text/html'
		},
		body: JSON.stringify( {
			instances: [
				/* eslint-disable camelcase */
				{
					modified_text: text,
					page_title: titleText,
					original_text: '',
					check_type: 'tone',
					lang: mw.config.get( 'wgContentLanguage' )
				}
				/* eslint-enable camelcase */
			]
		} )
	} ).then(
		( response ) => response.json()
	);
};

/* Instance methods */

/**
 * @inheritdoc
 */
mw.editcheck.ToneCheck.prototype.canBeShown = function ( ...args ) {
	if ( !this.constructor.static.allowedContentLanguages.includes( mw.config.get( 'wgContentLanguage' ) ) ) {
		return false;
	}

	return mw.editcheck.ToneCheck.super.prototype.canBeShown.call( this, ...args );
};

mw.editcheck.ToneCheck.prototype.afterMemoized = function ( data ) {
	const outcome = data && data.predictions[ 0 ].prediction === true &&
		data.predictions[ 0 ].probability >= this.config.predictionThreshold;
	return !!outcome;
};

mw.editcheck.ToneCheck.prototype.newAction = function ( fragment, outcome ) {
	if ( !outcome ) {
		return null;
	}
	// TODO: variant message/labels when in back-from-presave state
	return new mw.editcheck.EditCheckAction( {
		fragments: [ fragment ],
		title: ve.msg( 'editcheck-tone-title' ),
		// eslint-disable-next-line no-jquery/no-append-html
		message: $( '<span>' ).append( ve.htmlMsg( 'editcheck-tone-description', ve.msg( 'editcheck-tone-descriptionlink' ) ) )
			.find( 'a' ).attr( 'target', '_blank' ).on( 'click', () => {
				ve.track( 'activity.editCheck-' + this.getName(), { action: 'click-learn-more' } );
			} ).end(),
		// eslint-disable-next-line no-jquery/no-append-html
		footer: $( '<span>' ).append( ve.htmlMsg( 'editcheck-tone-footer', ve.msg( 'editcheck-tone-footerlink' ) ) )
			.find( 'a' ).attr( 'target', '_blank' ).on( 'click', () => {
				ve.track( 'activity.editCheck-' + this.getName(), { action: 'click-model-card' } );
			} ).end(),
		check: this,
		choices: [
			{
				action: 'edit',
				label: ve.msg( 'editcheck-dialog-action-revise' ),
				icon: 'edit'
			},
			{
				action: 'dismiss',
				label: ve.msg( 'editcheck-dialog-action-decline' ),
				icon: 'check'
			}
		]
	} );
};

mw.editcheck.ToneCheck.prototype.act = function ( choice, action, surface ) {
	this.tag( 'interacted', action );
	if ( choice === 'dismiss' ) {
		return action.widget.showFeedback( {
			choices: [
				{
					data: 'appropriate',
					label: ve.msg( 'editcheck-tone-reject-appropriate' )
				},
				{
					data: 'uncertain',
					label: ve.msg( 'editcheck-tone-reject-uncertain' )
				},
				{
					data: 'other',
					label: ve.msg( 'editcheck-tone-reject-other' )
				}
			]
		} ).then( ( reason ) => {
			this.dismiss( action );
			return ve.createDeferred().resolve( { action: choice, reason: reason } ).promise();
		} );
	} else if ( choice === 'edit' && surface ) {
		return this.controller.closeDialog().then( () => {
			surface.getView().activate();
			action.fragments[ action.fragments.length - 1 ].collapseToStart().select();
		} );
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ToneCheck );
