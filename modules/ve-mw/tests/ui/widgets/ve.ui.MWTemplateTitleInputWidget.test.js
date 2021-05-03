( function () {
	function enableCirrusSearchLookup( enabled ) {
		const config = mw.config.get( 'wgVisualEditorConfig' );
		config.cirrusSearchLookup = enabled;
		mw.config.set( 'wgVisualEditorConfig', config );
	}

	QUnit.module( 've.ui.MWTemplateTitleInputWidget', QUnit.newMwEnvironment( {
		afterEach() {
			enableCirrusSearchLookup( false );
		}
	} ) );

	QUnit.test( 'default prefixsearch', ( assert ) => {
		const widget = new ve.ui.MWTemplateTitleInputWidget(),
			query = 'a',
			apiParams = widget.getApiParams( query );

		assert.deepEqual( apiParams, {
			action: 'query',
			generator: 'prefixsearch',
			gpslimit: 10,
			gpsnamespace: 10,
			gpssearch: 'a',
			ppprop: 'disambiguation',
			prop: [ 'info', 'pageprops' ],
			redirects: true
		} );
	} );

	QUnit.test( 'CirrusSearch: all API parameters', ( assert ) => {
		enableCirrusSearchLookup( true );
		const widget = new ve.ui.MWTemplateTitleInputWidget(),
			query = 'a',
			apiParams = widget.getApiParams( query );

		assert.deepEqual( apiParams, {
			action: 'query',
			generator: 'search',
			gsrlimit: 10,
			gsrnamespace: 10,
			gsrsearch: 'a*',
			ppprop: 'disambiguation',
			prop: [ 'info', 'pageprops' ],
			redirects: true
		} );
	} );

	QUnit.test( 'CirrusSearch: prefixsearch behavior', ( assert ) => {
		enableCirrusSearchLookup( true );
		const widget = new ve.ui.MWTemplateTitleInputWidget();

		[
			{
				query: 'a',
				expected: 'a*'
			},
			{
				query: 'ü',
				expected: 'ü*'
			},
			{
				query: '3',
				expected: '3*'
			},
			{
				query: '!!',
				expected: '!!*'
			}
		].forEach( ( data ) => {
			const apiParams = widget.getApiParams( data.query );

			assert.strictEqual(
				apiParams.gsrsearch,
				data.expected,
				'Searching for ' + data.query
			);
		} );
	} );
}() );
