/*!
 * VisualEditor MWWikitextDataTransferHandlerFactory class.
 *
 * @copyright 2011-2016 VisualEditor Team and others; see http://ve.mit-license.org
 */

/**
 * Drop handler Factory.
 *
 * @class
 * @extends ve.ui.DataTransferHandlerFactory
 * @constructor
 */
ve.ui.MWWikitextDataTransferHandlerFactory = function VeUiMwWikitextDataTransferHandlerFactory() {
	var name,
		factory = this;

	// Parent constructor
	ve.ui.MWWikitextDataTransferHandlerFactory.super.apply( this, arguments );

	for ( name in ve.ui.dataTransferHandlerFactory.registry ) {
		this.register( ve.ui.dataTransferHandlerFactory.registry[ name ] );
	}

	ve.ui.dataTransferHandlerFactory.on( 'register', function ( name, data ) {
		factory.register( data );
	} );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWWikitextDataTransferHandlerFactory, ve.ui.DataTransferHandlerFactory );

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWWikitextDataTransferHandlerFactory.prototype.create = function () {
	// Parent method
	var doc,
		handler = ve.ui.MWWikitextDataTransferHandlerFactory.super.prototype.create.apply( this, arguments ),
		resolve = handler.resolve.bind( handler );

	function isPlain( data ) {
		return typeof data === 'string' || ve.dm.LinearData.static.getType( data ) === 'paragraph';
	}

	handler.resolve = function ( dataOrDoc ) {
		if ( typeof dataOrDoc === 'string' || ( Array.isArray( dataOrDoc ) && dataOrDoc.every( isPlain ) ) ) {
			resolve( dataOrDoc );
		} else {
			doc = dataOrDoc instanceof ve.dm.Document ? dataOrDoc : new ve.dm.Document( dataOrDoc );
			ve.init.target.getWikitextFragment( doc )
				.done( resolve )
				.fail( function () {
					handler.abort();
				} );
		}
	};

	return handler;
};

/* Initialization */

ve.ui.wikitextDataTransferHandlerFactory = new ve.ui.MWWikitextDataTransferHandlerFactory();

ve.ui.wikitextDataTransferHandlerFactory.unregister( ve.ui.MWWikitextStringTransferHandler );
