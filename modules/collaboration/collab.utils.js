var ve = require( './server/collab.ve.js' ).ve;

if( !collab ) {
	var collab = {};
}

collab.utils = {}

collab.utils.deserializeTransaction = function( transaction ) {
	var copyProperties = function( src, target ) {
		for( prop in src ) {
			target[prop] = src[prop];
		}
		return target;
	}

	var deserializeAnnotation = function( object ) {
		var name = object.name;
		var annotationObj = ve.dm.annotationFactory.create( name );
		return copyProperties( object, annotationObj );
	}

	var deserializeAnnotationSet = function( object ) {
		var annotationSetObj = new ve.AnnotationSet();
		return copyProperties( object, annotationSetObj );
	}

	var ops = transaction.operations;
	for( var i = 0; i < ops.length; i++ ) {
		if( ops[i].type === 'replace' ) {
			for( var x = 0, j = ops[i].insert.length; x < j; x++ ) {
				var caret = ops[i].insert[x];
				if( caret.length > 1 ) {
					var annotationSet = caret[1];
					ops[i].insert[x][1] = deserializeAnnotationSet( annotationSet );
				}
			}
		}

		else if( ops[i].type === 'annotate' ) {
			var annotation = ops[i].annotation;
			ops[i].annotation = deserializeAnnotation( annotation );
			console.log(ops[i].annotation.constructor);
		}
	}
	transaction.operations = ops;

	var transactionObj = copyProperties( transaction, new ve.dm.Transaction() );
	return transactionObj;
}

if ( typeof module == 'object' ) {
	module.exports.utils = collab.utils;
}