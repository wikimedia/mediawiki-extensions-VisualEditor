/*!
 * VisualEditor MediaWiki event subscriber.
 *
 * Subscribes to ve.track() events and routes them to mw.track().
 *
 * @copyright 2011-2018 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

( function () {
	var timing, editingSessionId;

	timing = {};
	editingSessionId = mw.user.generateRandomSessionId();

	function computeDuration( action, event, timeStamp ) {
		if ( event.timing !== undefined ) {
			return event.timing;
		}

		switch ( action ) {
			case 'ready':
				return timeStamp - timing.init;
			case 'loaded':
				return timeStamp - timing.init;
			case 'saveIntent':
				return timeStamp - timing.ready;
			case 'saveAttempt':
				return timeStamp - timing.saveIntent;
			case 'saveSuccess':
			case 'saveFailure':
				// HERE BE DRAGONS: the caller must compute these themselves
				// for sensible results. Deliberately sabotage any attempts to
				// use the default by returning -1
				mw.log.warn( 've.init.mw.trackSubscriber: Do not rely on default timing value for saveSuccess/saveFailure' );
				return -1;
			case 'abort':
				switch ( event.type ) {
					case 'preinit':
						return timeStamp - timing.init;
					case 'nochange':
					case 'switchwith':
					case 'switchwithout':
					case 'switchnochange':
					case 'abandon':
						return timeStamp - timing.ready;
					case 'abandonMidsave':
						return timeStamp - timing.saveAttempt;
				}
		}
		mw.log.warn( 've.init.mw.trackSubscriber: Unrecognized action', action );
		return -1;
	}

	function mwEditHandler( topic, data, timeStamp ) {
		var action = topic.split( '.' )[ 1 ],
			event;

		timeStamp = timeStamp || this.timeStamp; // I8e82acc12 back-compat

		if ( action === 'init' ) {
			// Regenerate editingSessionId
			editingSessionId = mw.user.generateRandomSessionId();
		}

		// Sample at 6.25% (via hex digit)
		if ( editingSessionId.charAt( 0 ) > '0' ) {
			return;
		}

		if (
			action === 'abort' &&
			( data.type === 'unknown' || data.type === 'unknown-edited' )
		) {
			if (
				timing.saveAttempt &&
				timing.saveSuccess === undefined &&
				timing.saveFailure === undefined
			) {
				data.type = 'abandonMidsave';
			} else if (
				timing.init &&
				timing.ready === undefined
			) {
				data.type = 'preinit';
			} else if ( data.type === 'unknown' ) {
				data.type = 'nochange';
			} else {
				data.type = 'abandon';
			}
		}

		// Convert mode=source/visual to editor name
		if ( data && data.mode ) {
			data.editor = data.mode === 'source' ? 'wikitext-2017' : 'visualeditor';
			delete data.mode;
		}

		if ( !data.platform ) {
			if ( ve.init && ve.init.target && ve.init.target.constructor.static.platformType ) {
				data.platform = ve.init.target.constructor.static.platformType;
			} else {
				data.platform = 'other';
				// TODO: outright abort in this case, once we think we've caught everything
				mw.log.warn( 've.init.mw.trackSubscriber: no target available and no platform specified', action );
			}
		}

		event = $.extend( {
			version: 1,
			action: action,
			editor: 'visualeditor',
			integration: ve.init && ve.init.target && ve.init.target.constructor.static.integrationType || 'page',
			'page.id': mw.config.get( 'wgArticleId' ),
			'page.title': mw.config.get( 'wgPageName' ),
			'page.ns': mw.config.get( 'wgNamespaceNumber' ),
			'page.revid': mw.config.get( 'wgRevisionId' ),
			editingSessionId: editingSessionId,
			'user.id': mw.user.getId(),
			'user.editCount': mw.config.get( 'wgUserEditCount', 0 ),
			'mediawiki.version': mw.config.get( 'wgVersion' )
		}, data );

		if ( mw.user.isAnon() ) {
			event[ 'user.class' ] = 'IP';
		}

		event[ 'action.' + action + '.type' ] = event.type;
		event[ 'action.' + action + '.mechanism' ] = event.mechanism;
		if ( action !== 'init' ) {
			event[ 'action.' + action + '.timing' ] = Math.round( computeDuration( action, event, timeStamp ) );
		}
		event[ 'action.' + action + '.message' ] = event.message;

		// Remove renamed properties
		delete event.type;
		delete event.mechanism;
		delete event.timing;
		delete event.message;

		if ( action === 'abort' ) {
			timing = {};
		} else {
			timing[ action ] = timeStamp;
		}

		mw.track( 'event.Edit', event );
	}

	function mwTimingHandler( topic, data ) {
		// Add type for save errors; not in the topic for stupid historical reasons
		if ( topic === 'mwtiming.performance.user.saveError' ) {
			topic = topic + '.' + data.type;
		}

		// Map mwtiming.foo --> timing.ve.foo.mobile
		topic = topic.replace( /^mwtiming/, 'timing.ve.' + data.targetName );
		mw.track( topic, data.duration );
	}

	function activityHandler( topic, data ) {
		var feature = topic.split( '.' )[ 1 ],
			event;

		// Sample at 6.25% (via hex digit)
		if ( editingSessionId.charAt( 0 ) > '0' ) {
			return;
		}

		event = {
			feature: feature,
			action: data.action,
			editingSessionId: editingSessionId
		};

		mw.track( 'event.VisualEditorFeatureUse', event );
	}

	if ( mw.loader.getState( 'schema.Edit' ) !== null ) {
		// Only route any events into the Edit schema if the module is actually available.
		// It won't be if EventLogging is installed but WikimediaEvents is not.
		ve.trackSubscribe( 'mwedit.', mwEditHandler );
		ve.trackSubscribe( 'mwtiming.', mwTimingHandler );
	}

	if ( mw.loader.getState( 'schema.VisualEditorFeatureUse' ) !== null ) {
		// Similarly for the VisualEditorFeatureUse schema
		ve.trackSubscribe( 'activity.', activityHandler );
	}

}() );
