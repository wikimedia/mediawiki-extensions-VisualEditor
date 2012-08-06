var ve = require( '../../server/collab.ve.js' ).ve, 
	Document = require( '../../server/collab.Document.js' ).Document,
	$ = require( 'jquery' );

exports[ 'collab.Document' ] = {
	'applyTransaction': function( test ) {
		test.expect( 3 );
		var document = new Document( 'test', '<p>Test data</p>' );
		var session = {
			isPublisher: false
		};
		var transactionData = { 
			args:	{ publisherID: 'testUser2' },
			transaction:  {
				lengthDifference: 1,
				operations: [
					{ type: 'retain', length: 6 },
					{ type: 'replace', insert: ['D'], remove: ['d'] },
					{ type: 'retain', length: 9 }
				],
				isBroadcasted: true
			}
		};
		
		var result = document.applyTransaction( session, transactionData );
		test.equal( result, false );
		
		session.isPublisher = true;
		var result = document.applyTransaction( session, transactionData );
		test.equal( result, true );
	
		var htmlDom = ve.dm.converter.getDomFromData( document.dmDoc.getData() );
		var html = $( htmlDom ).html();
		test.equal( html, '<p>Test Data</p>' );
		test.done();

	}
};
