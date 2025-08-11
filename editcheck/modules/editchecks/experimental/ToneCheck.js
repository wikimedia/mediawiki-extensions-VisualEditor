mw.editcheck.ToneCheck = function MWToneCheck() {
	// Parent constructor
	mw.editcheck.ToneCheck.super.apply( this, arguments );

	this.notifySuccess = () => {
		mw.notify( ve.msg( 'editcheck-tone-thank' ), { type: 'success' } );
	};
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
				modes: [ '' ]
			},
			{
				action: 'recheck',
				label: ve.msg( 'editcheck-dialog-action-recheck' ),
				flags: [ 'primary', 'progressive' ],
				icon: 'check',
				modes: [ 'revising' ]
			},
			{
				action: 'dismiss',
				label: ve.msg( 'editcheck-dialog-action-decline' ),
				modes: [ '', 'revising' ]
			}
		]
	} );
};

mw.editcheck.ToneCheck.prototype.act = function ( choice, action, surface ) {
	action.off( 'discard', this.notifySuccess );
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
		action.setStale( true );
		// Once revising has started the user will either make enough of an
		// edit that this action is discarded, or will `act` again and this
		// event-handler will be removed above:
		action.once( 'discard', this.notifySuccess );
		// If in pre-save mode, close the check dialog
		const closePromise = this.controller.inBeforeSave ? this.controller.closeDialog() : ve.createDeferred().resolve().promise();
		return closePromise.then( () => {
			action.fragments[ action.fragments.length - 1 ].collapseToEnd().select();
			surface.getView().activate( true );
			surface.getView().focus();
		} );
	} else if ( choice === 'recheck' ) {
		const recheckDeferred = ve.createDeferred();

		const progress = new OO.ui.ProgressBarWidget( {
			progress: false,
			inline: true
		} );
		action.widget.$body.prepend( progress.$element );

		this.checkText( action.fragments[ action.fragments.length - 1 ].getText() )
			.then( ( result ) => {
				recheckDeferred.resolve( result );
			} );

		const minimumTimeDeferred = ve.createDeferred();
		setTimeout( () => {
			minimumTimeDeferred.resolve();
		}, 500 );

		setTimeout( () => {
			/* Silently fail if it takes too long */
			recheckDeferred.resolve();
		}, 3000 );
		// Caller requires a Deferred as it then calls '.always()'
		// eslint-disable-next-line no-jquery/no-when
		return $.when( recheckDeferred, minimumTimeDeferred ).then( ( result ) => {
			action.setStale( false );
			if ( !result ) {
				this.notifySuccess();
				this.controller.removeAction( 'onBranchNodeChange', action, false );
			}
		} );
	}
};

mw.editcheck.editCheckFactory.register( mw.editcheck.ToneCheck );
