mw.editcheck.ToneCheck = function MWToneCheck( /* config */ ) {
	// Parent constructor
	mw.editcheck.ToneCheck.super.apply( this, arguments );
};

OO.inheritClass( mw.editcheck.ToneCheck, mw.editcheck.AsyncTextCheck );

/* Static properties */

mw.editcheck.ToneCheck.static.name = 'tone';

mw.editcheck.ToneCheck.static.predictionThreshold = 0.8;

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

	return fetch( 'https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict', {
		method: 'POST',
		headers: {
			'Content-Type': 'text/html'
		},
		body: JSON.stringify( {
			instances: [
				// eslint-disable-next-line camelcase
				{ original_text: '', modified_text: text, check_type: 'tone', lang: 'en' }
			]
		} )
	} ).then(
		( response ) => response.json()
	).then( ( data ) => {
		const outcome = data.predictions[ 0 ].prediction === true &&
			data.predictions[ 0 ].probability >= mw.editcheck.ToneCheck.static.predictionThreshold;
		return !!outcome;
	} );
};

/* Instance methods */

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
		this.dismiss( action );
		return ve.createDeferred().resolve( { action: choice } ).promise();
	} else if ( choice === 'edit' && surface ) {
		return this.controller.closeDialog().then( () => {
			surface.getView().activate();
			action.fragments[ action.fragments.length - 1 ].collapseToStart().select();
		} );
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ToneCheck );
