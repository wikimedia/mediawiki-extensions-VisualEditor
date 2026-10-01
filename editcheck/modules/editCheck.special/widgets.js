/**
 * Show the edit check cards on Special:EditChecks.
 *
 * The cards come from the same code as in the editor, so they always look the same.
 *
 * @module ext.visualEditor.editCheck.special.widgets
 */

// init.js does not define mw.editcheck if ecenable=0
const factory = mw.editcheck && mw.editcheck.editCheckFactory;

/**
 * Find a check class by name
 *
 * init.js can unregister a check (e.g. for an A/B test), but the page must show it.
 *
 * @param {string} name
 * @return {Function|undefined}
 */
function getCheckClass( name ) {
	return factory.lookup( name ) || Object.values( mw.editcheck ).find(
		( value ) => typeof value === 'function' &&
			value.prototype instanceof mw.editcheck.BaseEditCheck &&
			value.static.name === name
	);
}

/**
 * Render an action as a card
 *
 * @param {mw.editcheck.EditCheckAction} action
 * @return {jQuery}
 */
function renderAction( action ) {
	const widget = action.render( false, false );
	// There is no surface, so the choices must not act.
	widget.disconnect( action );
	const reportItem = widget.suggestionFeedbackMenuSelect &&
		widget.suggestionFeedbackMenuSelect.getMenu().findItemFromData( 'feedback' );
	if ( reportItem ) {
		// A report from this page is not about a real edit
		reportItem.setDisabled( true );
	}
	return widget.$element;
}

/**
 * Show a card for each action mode of a check
 *
 * @param {jQuery} $container
 * @param {string} name Check name
 * @param {boolean} suggestion
 */
function showCheck( $container, name, suggestion ) {
	const CheckClass = getCheckClass( name );
	if ( !CheckClass ) {
		return;
	}
	const check = new CheckClass( null, factory.buildConfig( name ), suggestion );
	const modeConfigs = Object.keys( CheckClass.static.actionModes ).map(
		( mode ) => ve.extendObject( { mode }, CheckClass.static.actionModes[ mode ] )
	);
	[ {}, ...modeConfigs ].forEach( ( modeConfig ) => {
		// An error in one mode must not stop the other modes
		try {
			const action = new mw.editcheck.EditCheckAction( ve.extendObject( {
				check,
				fragments: [],
				suggestion
			}, modeConfig ) );
			if ( action.getTitle() || action.getDescription() ) {
				const $card = renderAction( action );
				$container.append( $card );
			}
		} catch ( e ) {
			mw.log.error( `Special:EditChecks failed to show check '${ name }' in mode '${ modeConfig.mode || '' }'`, e );
		}
	} );
}

/**
 * Show the card for a TextMatch rule
 *
 * @param {jQuery} $container
 * @param {string} ruleId
 * @param {boolean} suggestion
 * @return {Promise}
 */
function showMatchRule( $container, ruleId, suggestion ) {
	const TextMatchEditCheck = mw.editcheck.TextMatchEditCheck;
	return TextMatchEditCheck.static.ensureMatchRulesLoaded().then( ( cache ) => {
		const rule = cache && cache.rawMatchRules[ ruleId ];
		if ( !rule ) {
			return;
		}
		const check = new TextMatchEditCheck( null, factory.buildConfig( 'textMatch' ), suggestion );
		check.instantiateMatchRules( { [ ruleId ]: rule } );
		const matchRule = check.matchRules[ 0 ];
		if ( !matchRule ) {
			return;
		}
		const $card = renderAction( new mw.editcheck.TextMatchEditCheckAction( {
			check,
			fragments: [],
			suggestion,
			title: matchRule.title,
			message: matchRule.message,
			mode: matchRule.mode,
			ruleConfig: matchRule.config,
			matchRuleId: matchRule.id
		} ) );
		$container.append( $card );
	} );
}

mw.hook( 'wikipage.content' ).add( ( $content ) => {
	if ( !factory ) {
		return;
	}
	$content.find( '.mw-editchecks-widget' ).each( ( i, element ) => {
		// The hook can fire again for the same content
		if ( element.dataset.rendered ) {
			return;
		}
		element.dataset.rendered = '1';
		const $container = $( element );
		const name = element.dataset.check;
		const ruleId = element.dataset.matchRule;
		const suggestion = !!element.dataset.suggestion;
		try {
			if ( ruleId !== undefined ) {
				showMatchRule( $container, ruleId, suggestion ).catch( ( e ) => {
					mw.log.error( `Special:EditChecks failed to show rule '${ ruleId }'`, e );
				} );
			} else {
				showCheck( $container, name, suggestion );
			}
		} catch ( e ) {
			mw.log.error( `Special:EditChecks failed to show check '${ name }'`, e );
		}
	} );
} );
