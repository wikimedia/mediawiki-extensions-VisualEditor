var express = require( 'express' );

var app = express.createServer();
app.use(express.bodyParser());

app.get('/', function( req, res ) {
	res.end( 'Useless endpoint. Use GET /<pagename>.' );
});

app.get( '/:page?', function( req, res ) {
	res.end( '<p>' + req.params.page + '</p>' );
});

if( module.parent ) {
	module.exports.app = app;
}
else {
	app.listen( 8080 );
}
