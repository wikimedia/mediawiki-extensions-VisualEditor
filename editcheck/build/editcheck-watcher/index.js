import { EventSource } from 'eventsource';
import fetch from 'node-fetch';

const STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';

const es = new EventSource( STREAM_URL );

es.onmessage = async ( event ) => {
	let data;
	try {
		data = JSON.parse( event.data );
	} catch ( err ) {
		return;
	}

	// Watch for edits to or creations of EditCheck config pages, e.g.
	// * MediaWiki:Editcheck-config.json
	// * MediaWiki_talk:Editcheck-config.json
	// * MediaWiki:Editcheck-config-LLM.json
	if ( !(
		( data.type === 'edit' || data.type === 'new' ) &&
		( data.namespace === 8 || data.namespace === 9 ) &&
		data.title.includes( ':Editcheck-config' )
	) ) {
		return;
	}

	const isTalk = data.namespace % 2 === 1;

	const summary = data.comment || '(no summary)';
	const diffUrl = `${ data.server_url }/w/index.php?title=${ encodeURIComponent( data.title ) }&diff=${ data.revision.new }`;

	const text = `
${ isTalk ? '💬 *Talk page edited*' : '⚙️ *Config page edited*' }: ${ data.wiki } : ${ data.title }
- *User:* ${ data.user }
- *Summary:* ${ summary }
- *<${ diffUrl }|View diff>*
`;

	if ( process.env.SLACK_WEBHOOK_URL ) {
		await fetch( process.env.SLACK_WEBHOOK_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify( { text } )
		} );
	} else {
		console.log( text );
	}
};

es.onerror = ( err ) => {
	console.error( 'EventSource failed:', err );
};
