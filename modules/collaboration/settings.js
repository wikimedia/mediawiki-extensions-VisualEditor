collab = {};

collab.settings = {
	host: 'http://localhost',
	port: 8001,
	parsoidServiceUrl: 'http://localhost:8000/localhost/',
	authUrl: 'http://localhost/mediawiki/api.php?action=validatetoken&format=json'
};	

if( typeof module == 'object' ) {
	module.exports.settings = collab.settings;
}
